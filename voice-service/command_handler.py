"""
语音指令处理器
将识别出的文本映射到具体操作和回复话术
"""
import re
import logging

logger = logging.getLogger(__name__)


def process_command(text: str) -> dict:
    """
    解析语音指令，返回处理结果

    Args:
        text: ASR识别的文本

    Returns:
        {
            "response": str,   # TTS回复内容
            "action":   str,   # 前端执行的操作类型
            "params":   dict,  # 操作参数
        }
    """
    text = text.strip()
    logger.info(f"处理语音指令: {text!r}")

    # ---- 今日数据概览 ----
    if re.search(r"(今天|今日).*(数据|概览)", text):
        return {
            "response": "好的，正在为您展示今日数据概览",
            "action": "navigate",
            "params": {"page": "overview"},
        }

    # ---- 今日事件总数 ----
    if re.search(r"(今天|今日).*(事件|总数|数量)", text):
        return {
            "response": "正在为您查询今日事件总数，请稍候",
            "action": "query",
            "params": {"type": "event_count"},
        }

    # ---- 项目切换 ----
    match = re.search(r"项目.*(切换|换到|切到|去)\s*(.+?)(?:[，,。]|$)", text)
    if match:
        project = match.group(2).strip()
        return {
            "response": f"好的，正在为您切换到{project}项目",
            "action": "switchProject",
            "params": {"project": project},
        }

    # ---- 刷新数据 ----
    if re.search(r"刷新.*(数据|页面)?", text):
        return {
            "response": "好的，正在刷新数据",
            "action": "refresh",
            "params": {},
        }

    # ---- 打开页面 ----
    match = re.search(r"(打开|跳转到?|去)\s*(.+?)(?:页面|$)", text)
    if match:
        page = match.group(2).strip()
        if page:
            return {
                "response": f"好的，正在为您打开{page}页面",
                "action": "navigate",
                "params": {"page": page},
            }

    # ---- 关闭语音服务 ----
    if re.search(r"(关闭|退出).*(语音|服务)", text):
        return {
            "response": "好的，正在关闭语音服务，再见",
            "action": "stopService",
            "params": {},
        }

    # ---- 未识别 ----
    logger.warning(f"未匹配到任何指令: {text!r}")
    return {
        "response": f'我听到您说"{text}"，暂时不支持该指令，请重试',
        "action": "unknown",
        "params": {"text": text},
    }
