"""
数据库操作模块
"""
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.engine import URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
from config import MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE

# 数据库连接URL
DB_URL = URL.create(
    "mysql+pymysql",
    username=MYSQL_USER,
    password=MYSQL_PASSWORD,
    host=MYSQL_HOST,
    port=MYSQL_PORT,
    database=MYSQL_DATABASE,
    query={"charset": "utf8mb4"},
)

# 创建数据库引擎，调大连接池防止耗尽
engine = create_engine(
    DB_URL,
    echo=False,
    pool_recycle=3600,
    pool_size=10,  # 连接池大小
    max_overflow=20,  # 最大溢出连接
    pool_pre_ping=True  # 自动检查连接有效性
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 配置表模型
class VoiceConfig(Base):
    __tablename__ = "voice_config"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    config_key = Column(String(50), unique=True, index=True, comment="配置键")
    config_value = Column(Text, comment="配置值")
    description = Column(String(200), comment="配置描述")
    create_time = Column(DateTime, default=datetime.now, comment="创建时间")
    update_time = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

# 历史记录表模型
class VoiceHistory(Base):
    __tablename__ = "voice_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    wake_word = Column(String(50), comment="唤醒词")
    instruction_text = Column(Text, comment="用户指令文本")
    tts_text = Column(Text, comment="播报文本")
    status = Column(String(20), default="success", comment="状态：success/fail")
    duration = Column(Integer, default=0, comment="交互时长(秒)")
    create_time = Column(DateTime, default=datetime.now, comment="创建时间")

# 创建表（如果不存在）
def create_tables():
    Base.metadata.create_all(bind=engine)

# 获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 配置操作工具类
class ConfigManager:
    @staticmethod
    def get_config(key, default=None):
        """获取配置值"""
        db = next(get_db())
        try:
            config = db.query(VoiceConfig).filter(VoiceConfig.config_key == key).first()
            if config:
                try:
                    return json.loads(config.config_value)
                except:
                    return config.config_value
            return default
        finally:
            db.close()

    @staticmethod
    def set_config(key, value, description=""):
        """设置配置值"""
        db = next(get_db())
        try:
            config = db.query(VoiceConfig).filter(VoiceConfig.config_key == key).first()
            value_str = json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else str(value)
            if config:
                config.config_value = value_str
                config.description = description
            else:
                config = VoiceConfig(
                    config_key=key,
                    config_value=value_str,
                    description=description
                )
                db.add(config)
            db.commit()
            return True
        finally:
            db.close()

    @staticmethod
    def get_all_config():
        """获取所有配置"""
        db = next(get_db())
        try:
            configs = db.query(VoiceConfig).all()
            result = {}
            for config in configs:
                try:
                    result[config.config_key] = json.loads(config.config_value)
                except:
                    result[config.config_key] = config.config_value
            return result
        finally:
            db.close()

# 历史记录操作工具类
class HistoryManager:
    @staticmethod
    def add_history(wake_word, instruction_text, tts_text, status="success", duration=0):
        """添加历史记录"""
        db = next(get_db())
        try:
            history = VoiceHistory(
                wake_word=wake_word,
                instruction_text=instruction_text,
                tts_text=tts_text,
                status=status,
                duration=duration
            )
            db.add(history)
            db.commit()
            return history.id
        finally:
            db.close()

    @staticmethod
    def get_history_list(page=1, page_size=20, keyword=""):
        """分页获取历史记录"""
        db = next(get_db())
        try:
            query = db.query(VoiceHistory)
            if keyword:
                query = query.filter(
                    (VoiceHistory.instruction_text.like(f"%{keyword}%")) |
                    (VoiceHistory.tts_text.like(f"%{keyword}%"))
                )
            total = query.count()
            records = query.order_by(VoiceHistory.create_time.desc()).offset((page-1)*page_size).limit(page_size).all()
            return {
                "total": total,
                "page": page,
                "page_size": page_size,
                "list": [
                    {
                        "id": item.id,
                        "wake_word": item.wake_word,
                        "instruction_text": item.instruction_text,
                        "tts_text": item.tts_text,
                        "status": item.status,
                        "duration": item.duration,
                        "create_time": item.create_time.strftime("%Y-%m-%d %H:%M:%S")
                    } for item in records
                ]
            }
        finally:
            db.close()

    @staticmethod
    def clear_history():
        """清空历史记录"""
        db = next(get_db())
        try:
            db.query(VoiceHistory).delete()
            db.commit()
            return True
        finally:
            db.close()

# 初始化默认配置
def init_default_config():
    """初始化默认配置"""
    from config import (
        WAKE_WORD, WAKE_WORD_ALTERNATIVES, ACTIVE_TIMEOUT,
        TTS_VOICE, TTS_RATE, TTS_VOLUME
    )

    default_configs = [
        ("wake_word", WAKE_WORD, "主唤醒词"),
        ("wake_word_alternatives", WAKE_WORD_ALTERNATIVES, "备用唤醒词列表"),
        ("active_timeout", ACTIVE_TIMEOUT, "激活超时时间(秒)"),
        ("tts_voice", TTS_VOICE, "TTS音色"),
        ("tts_rate", TTS_RATE, "TTS语速"),
        ("tts_volume", TTS_VOLUME, "TTS音量"),
        ("greeting_text", "你好我是小智", "唤醒欢迎语"),
        ("explanation_words", {}, "讲解词配置"),
        ("voiceprint_enabled", False, "是否启用声纹验证"),
        ("voiceprint_users", [], "已注册的声纹用户列表")
    ]

    for key, value, desc in default_configs:
        if not ConfigManager.get_config(key):
            ConfigManager.set_config(key, value, desc)

# 初始化数据库
create_tables()
init_default_config()
