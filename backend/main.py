import os
import secrets
import string
import logging
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import SQLModel, Session, select
from sqlalchemy import create_engine, delete
from typing import List
import time
import socket
import psutil
import urllib.request
import json
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

from models import User, UserConfig, NavGroup, NavItem, TodoItem, Note, WeightRecord, SnippetItem, CountdownItem, UserCreate, Token, UserOut, SyncPayload
from auth import verify_password, get_password_hash, create_access_token, get_current_user_id

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sqlite_file_name = "data.db"
sqlite_url = f"sqlite:///./{sqlite_file_name}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def get_session():
    with Session(engine) as session:
        yield session

app = FastAPI(title="Artisan Dashboard Backend", version="1.0.0")

# CORS 配置：从环境变量读取允许的源，默认本地开发全开
_cors_origins_env = os.getenv("CORS_ORIGINS", "")
if _cors_origins_env:
    cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
else:
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _generate_secure_password(length: int = 16) -> str:
    """生成包含大小写字母与数字的随机安全密码"""
    alphabet = string.ascii_letters + string.digits
    while True:
        pwd = ''.join(secrets.choice(alphabet) for _ in range(length))
        # 确保包含至少一个大写、一个小写、一个数字
        if (any(c.isupper() for c in pwd)
                and any(c.islower() for c in pwd)
                and any(c.isdigit() for c in pwd)):
            return pwd

@app.on_event("startup")
def on_startup():
    # 自动建表初始化 SQLite data.db
    SQLModel.metadata.create_all(engine)

    # 自动创建默认用户：admin
    with Session(engine) as session:
        default_username = "admin"
        default_user = session.exec(select(User).where(User.username == default_username)).first()
        if not default_user:
            # 优先从环境变量读取密码，否则随机生成
            admin_password = os.getenv("ADMIN_PASSWORD", "").strip()
            if not admin_password:
                admin_password = _generate_secure_password()
                logger.info("=" * 60)
                logger.info("✅ 首次初始化 — 已创建管理员账户")
                logger.info(f"   用户名: admin")
                logger.info(f"   密  码: {admin_password}")
                logger.info("   ⚠️  请妥善保存此密码，后续将不再显示！")
                logger.info("   （如需固定密码，请在 .env 中设置 ADMIN_PASSWORD）")
                logger.info("=" * 60)
            else:
                logger.info("✅ 已使用 ADMIN_PASSWORD 环境变量创建管理员账户")

            hashed_pwd = get_password_hash(admin_password)
            db_user = User(username=default_username, hashed_password=hashed_pwd)
            session.add(db_user)
            session.commit()
            session.refresh(db_user)

            # 初始化默认配置与备忘录
            db_config = UserConfig(user_id=db_user.id)
            db_note = Note(user_id=db_user.id)
            session.add(db_config)
            session.add(db_note)
            session.commit()

# ==================== 1. 认证鉴权 API 接口 ====================

@app.post("/api/auth/register")
def register():
    """注册接口已按需停用，引导用户使用默认账号"""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="注册功能已关闭，请使用管理员账户（用户名: admin，密码见首次启动日志）登录"
    )

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    """账户登录并签发 JWT token 凭据"""
    user = session.exec(select(User).where(User.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码不匹配，无法核对凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserOut)
def read_users_me(user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    """获取当前登录用户信息"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户资料不存在")
    return user

# ==================== 2. 乾坤云同步 PUSH & PULL 核心接口 ====================

@app.get("/api/sync/pull", response_model=SyncPayload)
def pull_sync(user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    """
    拉取云端大包数据：
    获取该用户的配置、导航、待办、备忘和体重历史，组装成 payload 返回给客户端
    """
    config = session.exec(select(UserConfig).where(UserConfig.user_id == user_id)).first()
    groups = session.exec(select(NavGroup).where(NavGroup.user_id == user_id)).all()
    items = session.exec(select(NavItem).where(NavItem.user_id == user_id)).all()
    todos = session.exec(select(TodoItem).where(TodoItem.user_id == user_id)).all()
    note = session.exec(select(Note).where(Note.user_id == user_id)).first()
    weights = session.exec(select(WeightRecord).where(WeightRecord.user_id == user_id)).all()
    snippets = session.exec(select(SnippetItem).where(SnippetItem.user_id == user_id)).all()
    countdowns = session.exec(select(CountdownItem).where(CountdownItem.user_id == user_id)).all()

    return SyncPayload(
        logo_text=config.logo_text if config else "ARTISAN NAV",
        background_pattern=config.background_pattern if config else "dots",
        manga_font_enabled=config.manga_font_enabled if config else True,
        openai_key=config.openai_key if config else "",
        openai_base=config.openai_base if config else "https://api.deepseek.com",
        openai_model=config.openai_model if config else "deepseek-chat",
        widgets_json=config.widgets_json if config else '{"clock":true,"search":true,"sysinfo":true,"weather":true,"hitokoto":true,"ipcard":true,"aichat":true,"todo":true,"notes":true,"weight":true,"snippet":true,"devtools":true,"countdown":true}',
        groups=groups,
        items=items,
        todos=todos,
        note_content=note.content if note else "",
        note_password_hash=note.password_hash if note else "",
        weights=weights,
        snippets=snippets,
        countdowns=countdowns
    )

@app.post("/api/sync/push")
def push_sync(payload: SyncPayload, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    """
    推送覆盖云端数据：
    将前端当前所有的本地状态打包上传，清空云端旧数据并以该包覆盖写入，极速保持前后端云端同步。
    """
    # 1. 更新或插入全局配置 Config
    config = session.exec(select(UserConfig).where(UserConfig.user_id == user_id)).first()
    if not config:
        config = UserConfig(user_id=user_id)
    config.logo_text = payload.logo_text if payload.logo_text is not None else config.logo_text
    config.background_pattern = payload.background_pattern if payload.background_pattern is not None else config.background_pattern
    config.manga_font_enabled = payload.manga_font_enabled if payload.manga_font_enabled is not None else config.manga_font_enabled
    config.openai_key = payload.openai_key if payload.openai_key is not None else config.openai_key
    config.openai_base = payload.openai_base if payload.openai_base is not None else config.openai_base
    config.openai_model = payload.openai_model if payload.openai_model is not None else config.openai_model
    config.widgets_json = payload.widgets_json if payload.widgets_json is not None else config.widgets_json
    session.add(config)

    # 2. 更新或插入手札备忘 Note
    note = session.exec(select(Note).where(Note.user_id == user_id)).first()
    if not note:
        note = Note(user_id=user_id)
    note.content = payload.note_content if payload.note_content is not None else note.content
    note.password_hash = payload.note_password_hash if payload.note_password_hash is not None else note.password_hash
    session.add(note)

    # 3. 清理该用户所有的旧数据
    session.exec(delete(NavItem).where(NavItem.user_id == user_id))
    session.exec(delete(NavGroup).where(NavGroup.user_id == user_id))
    session.exec(delete(TodoItem).where(TodoItem.user_id == user_id))
    session.exec(delete(WeightRecord).where(WeightRecord.user_id == user_id))
    session.exec(delete(SnippetItem).where(SnippetItem.user_id == user_id))
    session.exec(delete(CountdownItem).where(CountdownItem.user_id == user_id))
    session.commit()

    # 4. 插入全新打包上传的数据集
    for g in payload.groups:
        g.user_id = user_id
        session.add(g)

    # 提交分组以防 navitem 存在外键挂载报错
    session.commit()

    for item in payload.items:
        item.user_id = user_id
        session.add(item)

    for todo in payload.todos:
        todo.user_id = user_id
        session.add(todo)

    for w in payload.weights:
        w.user_id = user_id
        session.add(w)

    for snip in payload.snippets:
        snip.user_id = user_id
        session.add(snip)

    for cd in payload.countdowns:
        cd.user_id = user_id
        session.add(cd)

    session.commit()
    return {"status": "success", "message": "星谱数据云端覆盖同步成功！"}

# ==================== 3. 硬件遥测与系统监控 API ====================

@app.get("/api/sysinfo/telemetry")
def get_sys_telemetry(user_id: int = Depends(get_current_user_id)):
    """获取服务器主机的 CPU、RAM、分区及 TOP 进程遥测数据"""
    # 1. CPU 与内存
    cpu_percent = psutil.cpu_percent(interval=0.1)
    virtual_mem = psutil.virtual_memory()
    ram_percent = virtual_mem.percent

    # 2. 本地固定硬盘分区空间
    partitions_data = []
    for part in psutil.disk_partitions():
        # 排除网络挂载和光盘
        if 'cdrom' in part.opts or 'fixed' not in part.opts.lower():
            if os.name == 'nt' and 'cdrom' in part.opts:
                continue
        try:
            usage = psutil.disk_usage(part.mountpoint)
            partitions_data.append({
                "name": part.mountpoint,
                "used": round(usage.percent, 1),
                "total": f"{usage.total / (1024**3):.1f} GB"
            })
        except Exception:
            continue

    # 3. 最占内存的活跃进程列表 Top 8
    processes_data = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'cmdline']):
        try:
            pinfo = proc.info
            mem_pct = pinfo['memory_percent'] or 0.0
            cpu_pct = pinfo['cpu_percent'] or 0.0
            
            # cmdline 转成简短参数说明
            cmd_args = pinfo['cmdline']
            desc = " ".join(cmd_args[:3]) if cmd_args else "background daemon"
            
            processes_data.append({
                "id": pinfo['pid'],
                "pid": pinfo['pid'],
                "name": pinfo['name'] or "unknown",
                "desc": desc,
                "cpu": round(cpu_pct, 1),
                "mem": round(mem_pct, 1),
                "status": "running"
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    processes_data = sorted(processes_data, key=lambda p: p['mem'], reverse=True)[:8]

    return {
        "cpu": cpu_percent,
        "ram": ram_percent,
        "partitions": partitions_data[:3],
        "processes": processes_data,
        "uptime": int(time.time() - psutil.boot_time())
    }

class KillPayload(BaseModel):
    pid: int

@app.post("/api/sysinfo/kill")
def kill_process(payload: KillPayload, user_id: int = Depends(get_current_user_id)):
    """温和地释放/杀死指定 PID 进程"""
    try:
        proc = psutil.Process(payload.pid)
        proc.terminate()
        return {"status": "success", "message": f"Process {payload.pid} terminated."}
    except psutil.NoSuchProcess:
        raise HTTPException(status_code=404, detail="Process not found.")
    except psutil.AccessDenied:
        raise HTTPException(status_code=403, detail="Access denied.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 4. 网络诊断与 TCP 延迟测试 API ====================

class ProbePayload(BaseModel):
    host: str

@app.post("/api/network/probe")
def probe_network(payload: ProbePayload, user_id: int = Depends(get_current_user_id)):
    """利用后端连接测试目标节点 443 / 80 端口时延，突破前端 CORS 阻断"""
    host = payload.host.strip()
    if "://" in host:
        host = host.split("://")[1]
    if "/" in host:
        host = host.split("/")[0]
    if ":" in host:
        host = host.split(":")[0]

    start = time.perf_counter()
    try:
        ip = socket.gethostbyname(host)
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.5)
        s.connect((ip, 443))
        s.close()
        latency = (time.perf_counter() - start) * 1000
        return {"status": "success", "latency": round(latency, 1)}
    except Exception:
        try:
            start_retry = time.perf_counter()
            ip = socket.gethostbyname(host)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2.5)
            s.connect((ip, 80))
            s.close()
            latency = (time.perf_counter() - start_retry) * 1000
            return {"status": "success", "latency": round(latency, 1)}
        except Exception:
            return {"status": "failed", "latency": None}

# ==================== 5. 大模型 AI 代理中转与流式响应 (SSE) ====================

class ChatPayload(BaseModel):
    messages: list

@app.post("/api/ai/chat")
def chat_agent(payload: ChatPayload, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    """安全代理托管：通过后端托管 API Key 进行对话并进行 SSE 流式分发"""
    config = session.exec(select(UserConfig).where(UserConfig.user_id == user_id)).first()
    
    # 优先读后台环境变量，其次读数据库存储
    api_key = os.getenv("OPENAI_API_KEY", "") or (config.openai_key if config else "")
    api_base = os.getenv("OPENAI_API_BASE", "") or (config.openai_base if config else "https://api.deepseek.com")
    api_model = os.getenv("OPENAI_API_MODEL", "") or (config.openai_model if config else "deepseek-chat")

    if not api_key:
        raise HTTPException(status_code=400, detail="AI_KEY_NOT_CONFIGURED")

    def event_generator():
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        req_data = {
            "model": api_model,
            "messages": payload.messages,
            "stream": True
        }
        req = urllib.request.Request(
            f"{api_base.rstrip('/')}/chat/completions",
            data=json.dumps(req_data).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                for line in response:
                    decoded = line.decode("utf-8").strip()
                    if not decoded:
                        continue
                    yield f"{decoded}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

