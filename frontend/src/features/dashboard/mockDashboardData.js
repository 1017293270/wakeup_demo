export const kpis = [
    { label: '今日唤醒次数', value: '2,324', delta: '+12.4%', trend: 'up' },
    { label: '有效对话数', value: '1,876', delta: '+8.1%', trend: 'up' },
    { label: 'ASR 准确率', value: '95.3%', delta: '+2.6%', trend: 'up' },
    { label: '平均响应时长', value: '1.28s', delta: '-5.4%', trend: 'down' }
];
export const wakeTrend = {
    hours: ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'],
    wakeups: [132, 96, 74, 118, 268, 346, 312, 386, 428, 392, 338, 232],
    dialogs: [94, 68, 52, 86, 214, 291, 264, 319, 361, 331, 286, 188]
};
export const wakeWordDistribution = [
    { name: '小智小智', value: 61.6 },
    { name: '小智', value: 18.4 },
    { name: '小志小志', value: 10.2 },
    { name: '其他近似词', value: 9.8 }
];
export const latencyBuckets = [
    { name: '<500ms', value: 42 },
    { name: '500-1000ms', value: 38 },
    { name: '1-2s', value: 16 },
    { name: '>2s', value: 4 }
];
export const qualityRows = [
    { label: '唤醒成功率', value: '98.2%', status: 'stable' },
    { label: '误唤醒率', value: '0.34%', status: 'safe' },
    { label: 'ASR 超时率', value: '1.1%', status: 'watch' },
    { label: 'TTS 成功率', value: '99.1%', status: 'stable' }
];
export const interactionRows = [
    '唤醒命中：小智小智，置信度 0.94',
    '识别文本：今天数据概览',
    '对话返回：今日服务运行正常',
    'TTS 播报完成，用时 620ms'
];
//# sourceMappingURL=mockDashboardData.js.map