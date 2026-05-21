"""
声纹识别服务（本地离线版）
使用MFCC特征提取 + GMM模型实现，轻量级，完全离线，适合小规模使用
"""
import logging
import numpy as np
import python_speech_features as psf
from sklearn.mixture import GaussianMixture
import joblib
import os
import json
from config import VOICEPRINT_GROUP_ID

logger = logging.getLogger(__name__)

# 声纹模型存储目录
MODEL_DIR = "voiceprint_models"
os.makedirs(MODEL_DIR, exist_ok=True)

# 用户列表配置文件
USER_LIST_FILE = os.path.join(MODEL_DIR, "users.json")

class VoiceprintService:
    def __init__(self):
        self.users = self._load_users()
        logger.info(f"本地声纹服务初始化完成，已注册用户数: {len(self.users)}")

    def _load_users(self):
        """加载已注册用户列表"""
        if os.path.exists(USER_LIST_FILE):
            with open(USER_LIST_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def _save_users(self):
        """保存用户列表"""
        with open(USER_LIST_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.users, f, ensure_ascii=False, indent=2)

    def _extract_features(self, audio_data, sample_rate=16000):
        """提取音频MFCC特征"""
        # 转成numpy数组
        audio_np = np.frombuffer(audio_data, dtype=np.int16)
        # 提取MFCC特征
        mfcc = psf.mfcc(audio_np, samplerate=sample_rate, numcep=20, nfilt=40)
        # 归一化
        mfcc = (mfcc - np.mean(mfcc)) / np.std(mfcc)
        return mfcc

    def register_voiceprint(self, voice_data, user_id, sample_rate=16000, format="pcm"):
        """
        注册声纹
        :param voice_data: 音频二进制数据（PCM格式，16k采样率，16bit，单声道）
        :param user_id: 用户唯一标识
        :param sample_rate: 采样率，默认16000
        :param format: 音频格式，仅支持pcm
        :return: 是否注册成功
        """
        try:
            # 提取特征
            features = self._extract_features(voice_data, sample_rate)
            # 训练GMM模型
            gmm = GaussianMixture(n_components=16, covariance_type='diag', reg_covar=1e-6)
            gmm.fit(features)
            # 保存模型
            model_path = os.path.join(MODEL_DIR, f"{user_id}.pkl")
            joblib.dump(gmm, model_path)
            # 更新用户列表
            self.users[user_id] = model_path
            self._save_users()
            logger.info(f"声纹注册成功，用户ID: {user_id}")
            return True, "注册成功"
        except Exception as e:
            logger.error(f"声纹注册异常: {e}", exc_info=True)
            return False, str(e)

    def verify_voiceprint(self, voice_data, sample_rate=16000, format="pcm"):
        """
        声纹验证（1:N比对）
        :param voice_data: 音频二进制数据（PCM格式，16k采样率，16bit，单声道）
        :param sample_rate: 采样率，默认16000
        :param format: 音频格式，仅支持pcm
        :return: (是否匹配成功, 匹配到的用户ID)
        """
        if not self.users:
            logger.warning("没有注册的声纹用户，跳过验证")
            return True, None  # 没有用户时默认允许

        try:
            # 提取特征
            features = self._extract_features(voice_data, sample_rate)
            # 遍历所有用户模型计算得分
            max_score = -float('inf')
            best_user = None
            for user_id, model_path in self.users.items():
                gmm = joblib.load(model_path)
                score = gmm.score(features)
                if score > max_score:
                    max_score = score
                    best_user = user_id
            # 阈值判断，可根据实际情况调整
            if max_score > -50:  # 阈值可调整，得分越高匹配度越高
                logger.info(f"声纹匹配成功，用户ID: {best_user}, 得分: {max_score:.2f}")
                return True, best_user
            logger.info(f"声纹匹配失败，最高得分: {max_score:.2f}，低于阈值")
            return False, None
        except Exception as e:
            logger.error(f"声纹验证异常: {e}", exc_info=True)
            return False, None

    def delete_voiceprint(self, user_id):
        """删除声纹"""
        try:
            if user_id not in self.users:
                return False, "用户不存在"
            # 删除模型文件
            model_path = self.users[user_id]
            if os.path.exists(model_path):
                os.remove(model_path)
            # 删除用户记录
            del self.users[user_id]
            self._save_users()
            logger.info(f"声纹删除成功，用户ID: {user_id}")
            return True, "删除成功"
        except Exception as e:
            logger.error(f"声纹删除异常: {e}", exc_info=True)
            return False, str(e)

# 全局实例
voiceprint_service = VoiceprintService()
