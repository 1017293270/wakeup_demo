from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

DB_URL = (
    f"mysql+pymysql://{settings.mysql_user}:{settings.mysql_password}"
    f"@{settings.mysql_host}:{settings.mysql_port}/{settings.mysql_database}"
    f"?charset=utf8mb4"
)

engine = create_engine(
    DB_URL,
    echo=False,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class VoiceConfig(Base):
    __tablename__ = "voice_config"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    config_key = Column(String(50), unique=True, index=True, comment="配置键")
    config_value = Column(Text, comment="配置值")
    description = Column(String(200), comment="配置描述")
    create_time = Column(DateTime, default=datetime.now)
    update_time = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class VoiceHistory(Base):
    __tablename__ = "voice_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    wake_word = Column(String(50), comment="唤醒词")
    instruction_text = Column(Text, comment="用户指令文本")
    tts_text = Column(Text, comment="播报文本")
    status = Column(String(20), default="success")
    duration = Column(Integer, default=0, comment="交互时长(秒)")
    create_time = Column(DateTime, default=datetime.now)


Base.metadata.create_all(bind=engine)
