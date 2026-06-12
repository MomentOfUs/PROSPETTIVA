from typing import Optional, List
from datetime import datetime
from sqlmodel import Field, SQLModel

# 1. 用户基本账户表
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 2. 全局配置表 (一对一关联 User)
class UserConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    logo_text: str = Field(default="ARTISAN NAV")
    background_pattern: str = Field(default="dots")
    manga_font_enabled: bool = Field(default=True)
    openai_key: Optional[str] = Field(default="")
    openai_base: Optional[str] = Field(default="https://api.deepseek.com")
    openai_model: Optional[str] = Field(default="deepseek-chat")
    widgets_json: str = Field(default='{"clock":true,"search":true,"sysinfo":true,"weather":true,"hitokoto":true,"ipcard":true,"aichat":true,"todo":true,"notes":true,"weight":true}')

# 3. 导航分组表
class NavGroup(SQLModel, table=True):
    id: str = Field(primary_key=True) # 前端生成的字符串 ID (例如 g1 或 timestamp)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str

# 4. 导航链接表
class NavItem(SQLModel, table=True):
    id: str = Field(primary_key=True)
    group_id: str = Field(foreign_key="navgroup.id")
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    url: str
    description: str = Field(default="")
    icon: str = Field(default="Link")
    color: str = Field(default="#2b2b2e")
    size: str = Field(default="normal")

# 5. 待办事项表
class TodoItem(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    text: str
    done: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 6. 秘语手札便签表 (一对一关联 User)
class Note(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    content: str = Field(default="")
    password_hash: Optional[str] = Field(default="")

# 7. 天体体重运行记录表
class WeightRecord(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    date: str
    weight: float
    body_fat: Optional[float] = Field(default=None)
    waist: Optional[float] = Field(default=None)
    hip: Optional[float] = Field(default=None)
    note: Optional[str] = Field(default=None)

# 8. 秘法咒语卡片表
class SnippetItem(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    content: str
    category: str = Field(default="通用")
    color: str = Field(default="#6e5020")
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 9. 命途星纪倒计时表
class CountdownItem(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    target_date: str  # YYYY-MM-DD format, e.g. "2026-06-18"
    category: str = Field(default="工作")
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== DTO 数据传输交互类 ====================

# 账号注册输入
class UserCreate(SQLModel):
    username: str
    password: str

# 登录返回
class Token(SQLModel):
    access_token: str
    token_type: str

# 用于获取当前登录人信息
class UserOut(SQLModel):
    id: int
    username: str

# 大规模一键云同步时使用的数据结构
class SyncPayload(SQLModel):
    logo_text: Optional[str] = None
    background_pattern: Optional[str] = None
    manga_font_enabled: Optional[bool] = None
    openai_key: Optional[str] = None
    openai_base: Optional[str] = None
    openai_model: Optional[str] = None
    widgets_json: Optional[str] = None
    groups: List[NavGroup] = []
    items: List[NavItem] = []
    todos: List[TodoItem] = []
    note_content: Optional[str] = None
    note_password_hash: Optional[str] = None
    weights: List[WeightRecord] = []
    snippets: List[SnippetItem] = []
    countdowns: List[CountdownItem] = []
