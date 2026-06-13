import os
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError as JWTError
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# 从环境变量读取密钥，若未设置则在运行时生成随机密钥（每次重启失效，仅适合开发）
_secret_from_env = os.getenv("JWT_SECRET_KEY")
if _secret_from_env:
    SECRET_KEY = _secret_from_env
else:
    SECRET_KEY = secrets.token_hex(32)
    logger.warning(
        "⚠️  JWT_SECRET_KEY 未设置，已自动生成随机密钥。重启后所有已签发 Token 将失效。"
        "生产环境请在 .env 文件中设置 JWT_SECRET_KEY。"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 默认登录有效期为 7 天

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# 定义 OAuth2 路由，默认采用 /api/auth/login 表单认证接口获取 token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证明文密码与哈希后密码是否匹配"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """计算密码的 bcrypt 强哈希"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """签发 JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
    """
    FastAPI 依赖拦截项：
    解密请求头中的 Bearer Token 并提取当前登录用户的 ID。
    如果解密失败或过期，则返回 401。
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="认证已失效或登录过期，请重新登录",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        return int(user_id_str)
    except JWTError:
        raise credentials_exception
