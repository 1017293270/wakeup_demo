// @ts-ignore
<template>
  <div class="kanban"
    style="width: 100%;height: 100%;background-color: #081E3E;position: fixed;left: 0;top: 0;z-index:999999999;display: flex;flex-direction: column;">
    <div class="titles"
      style="height:130px;position: relative;    width: 100%;display: flex;justify-content: space-between;align-items: flex-start;padding-top: 20px; font-size: 20px;font-weight: 700;clear: both;padding-left: 1%;padding-right: 1%;">
      <div class="weather">

        <span style="margin-right:20px;"><img style="width: 40px;height: 30zpx;margin-right: 10px;"
            src="@/assets/images/we2.png" alt=""> <span style="margin-right: 5px;">{{ tianqi.text_day }}</span> <span
            style="font-size: 16px;font-weight: 700; ">{{ tianqi.low
            }}-{{ tianqi.high }}</span>℃</span>

      </div>
      <div style="width: 250px;display: flex;justify-content: flex-end;">
        <div class="backTo" @click="gohome1()"
          style="display: flex;align-items: center; justify-content: center;width: 28px;height: 28px;border-radius: 2px;">

        </div>
      </div>
    </div>
    <div class="holeContent" style="height: 100%;display: flex;padding-left: 1%;padding-right: 1%;">
      <div class="left"
        style="width: 365px; height: 90%;display: flex;flex-direction: column;justify-content: space-between;">
        <div class="everyDiv">
          <!-- <div class="tits" style="position: relative;">事件抓取 </div> -->
          <div class="tit"><img src="@/assets/images/tit1.png" alt=""></div>
          <div class="everyCharts" :style="{ width, height: height1, background }">
            <div class="" style="height: 150px;display: flex; padding-top: 10px; justify-content: space-between">
              <div class="lefts1" style="width: 150px;height: 127px;padding-bottom: 20px;display: flex;">
                <div style="display: flex;flex-direction: column;margin-top: 5px; ">
                  <span style="font-size: 20px;font-weight: 700;margin-bottom: 0px;margin-left: 10px;">总量</span>
                  <span
                    style=" margin-left: 10px;font-size:30px; background: linear-gradient(180deg, #FFFFFF 23.96%, #54A9FF 100%);margin-bottom:0px; display: flex;align-items: flex-end; -webkit-background-clip: text;/*将设置的背景颜色限制在文字中*/-webkit-text-fill-color: transparent;font-size: 26px;"><span
                      style="font-size: 50px;font-weight: 700;margin-right: 2px; ">{{ datas1.eventNum }}</span><span
                      style="margin-bottom: 10px;">件</span></span>
                </div>
              </div>
              <div class="rights1">
                <div class="rights11">
                  <span style="margin-right: 20px;">已处理数</span>
                  <span class="num">{{ datas1.solveEventCount }}</span>
                </div>
                <div class="rights12">
                  <span style="margin-right: 20px;">未处理数</span>
                  <span class="num">{{ datas1.eventNum - datas1.solveEventCount }}</span>
                </div>
              </div>

            </div>
            <div class="ti"
              style="margin-top: 10px;padding-bottom: 10px;padding-top: 10px;display: flex;align-items: flex-end;">
              <div style="border-bottom: 1px solid #FF8A48;">
                <img src="@/assets/images/titIcon.png" alt="">
              </div>
              <div
                style="display: flex;align-items: center;justify-content: space-between;width: 100%;border-bottom: 1px solid #B9F2FF;height: 100%;height: 28px; ">
                <div class="left" style="color: white;font-size: 14px;color: #DCF4FF;font-weight: 700;">事件处置</div>
                <div style="color: white;display: flex" class="nowTime">
                  <div :class="nowTime == 0 ? 'active' : ''" @click="changeTime(0)">全部</div>
                  <div :class="nowTime == 1 ? 'active' : ''" class="nowMonth" @click="changeTime(1)"
                    style="margin-left: 3px;">未处理</div>
                  <div :class="nowTime == 2 ? 'active' : ''" class="nowYear" @click="changeTime(2)"
                    style="margin-left: 3px;">
                    已处理</div>
                </div>
              </div>


            </div>
            <div style="height: 100%;">

              <div id="ech1" ref="chartRef2" :style="{ width, height, background }"></div>
            </div>
          </div>
        </div>


        <div class="everyDiv">
          <!-- <div class="tits" style="position: relative;">事件抓取 </div> -->
          <div class="tit"><img src="@/assets/images/tit2.png" alt=""></div>
          <div class="everyCharts" :style="{ width, height: height1, background }">
            <div class="chart2"
              style="height: 150px;display: flex; padding-top: 10px; justify-content: space-between;color: white;padding-right: 10px">
              <div class="cent"
                style="height: 120px;width: 140px;display: flex;flex-direction: column;justify-content: space-between;align-items: center; ">
                <span><span style="font-size: 20px;font-weight: 700;">{{ datas2.totalNum }}</span>件</span>
                <span>问题总数</span>
              </div>

              <div class="cent1" style="width: 120px;height: 120px; ">
                <span><span style="font-size: 18px;font-weight: 700;">{{ datas2.replyNum }}</span></span>
                <span>已解决</span>

              </div>

              <div class="cent1 cent2" style="width: 120px;height: 120px;">
                <span><span style="font-size: 18px;font-weight: 700;">{{ datas2.noReplyNum }}</span></span>
                <span>待学习</span>

              </div>

            </div>
            <div class="ti"
              style="margin-top: 10px;padding-bottom: 10px;padding-top: 10px;display: flex;align-items: flex-end;">
              <div style="border-bottom: 1px solid #FF8A48;">
                <img src="@/assets/images/titIcon.png" alt="">
              </div>
              <div
                style="display: flex;align-items: center;justify-content: space-between;width: 100%;border-bottom: 1px solid #B9F2FF;height: 100%;height: 28px; ">
                <div class="left" style="color: white;font-size: 14px;color: #DCF4FF;font-weight: 700;">服务占比</div>
                <div style="color: white;display: flex" class="nowTime">
                  <!-- <div :class="nowTime1 == 0 ? 'active' : ''" @click="changeTime1(0)">已回复</div> -->
                  <div :class="nowTime1 == 1 ? 'active' : ''" class="nowMonth" @click="changeTime1(1)"
                    style="margin-left: 3px;">已回复</div>
                  <div :class="nowTime1 == 2 ? 'active' : ''" class="nowYear" @click="changeTime1(2)"
                    style="margin-left: 3px;">
                    未回复</div>
                </div>
              </div>
            </div>
            <div style="height: 100%;padding-bottom: 60px;">

              <div id="ech1" ref="chartRef" :style="{ width, height, background }"></div>
            </div>
          </div>
        </div>

      </div>
      <div class="center" id="mapDiv"
        style="width: 100%;height: 90%;margin-left: 1%;margin-right: 1%;margin-top: 10px;display: flex;justify-content: center;flex-grow:1;flex-basis: 0;">
        <div class="livs" style="display: flex; justify-content: center; width: 70%;flex-direction: column;flex-grow:0">


          <div class="typing-container" v-if="doubleCount.length > 0">
            <div> <span v-for="(char, index) in doubleCount" :key="index" class="char"
                :class="{ 'fade-in': show[index] }">{{
                  char }}</span></div>
          </div>
          <div class="typing-containers" v-if="doubleCount.length == 0">

          </div>
          <div class="lis"
            style="width: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center">
            <canvas class="livss" ref="liveCanvas" style="width: 100%" />
            <div class="speakDiv" v-if="isInput == false">
              <div class="speakChange" @click="changeStatus">
                <div class="mask"></div>切换
              </div>
              <div class="speakCenter" @mousedown="startRecording" @mouseup="stopRecording" v-if="shebei == 0"><img
                  v-if="isStarting == 0" src="@/assets/images/maike.png"
                  style="width: 15px;height: 20px; margin-right: 10px;" alt=""><img v-if="isStarting == 0"
                  src="@/assets/images/speaking.png" style="height: 18px;width: 80px;" alt="">
                <img v-if="isStarting == 3" src="@/assets/images/loads.gif" style="width: 30px; height: 30 px" alt="" />
                <div style="height: 40px" class="audio audios" v-if="isStarting == 1">
                  <div class="wave"></div>
                  <div class="wave"></div>
                  <div class="wave"></div>
                  <div class="wave"></div>
                  <div class="wave"></div>
                </div>
                <div style="width: 100%; display: flex; justify-content: center; align-items: center" @click="stop"
                  v-if="isStarting == 2">
                  <div style="height: 40px" class="audio audios">
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                  </div>
                </div>

              </div>
              <!-- <div  style="width:60px;margin-left:20px"></div> -->
              <div class="speakCenter" @touchstart="startRecording" @touchend="stopRecording" v-if="shebei == 1"> <img
                  v-if="isStarting == 0" src="@/assets/images/maike.png"
                  style="width: 15px;height: 20px; margin-right: 10px;" alt=""><img v-if="isStarting == 0"
                  src="@/assets/images/speaking.png" style="height: 18px;width: 80px;" alt="">
                <img v-if="isStarting == 3" src="@/assets/images/loads.gif" style="width: 30px; height: 30 px" alt="" />
                <div style="height: 40px" class="audio audios" v-if="isStarting == 1">
                  <div class="wave"></div>
                  <div class="wave"></div>
                  <div class="wave"></div>
                  <div class="wave"></div>
                  <div class="wave"></div>
                </div>
                <div style="width: 100%; display: flex; justify-content: center; align-items: center" @click="stop"
                  v-if="isStarting == 2">
                  <div style="height: 40px" class="audio audios">
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="speakDiv" v-if="isInput == true">
              <!-- <div style="width: 80px"> -->
              <div class="speakChange" @click="changeStatus">
                <div class="mask"></div>切换
              </div>
              <!-- </div> -->
              <a-input @keyup.enter="sendMessage" :id="'input111'" placeholder="请输入咨询内容"
                v-model:value="inputValue"></a-input>
              <div class="send" @click="sendMessage"><span>发送</span> </div>
            </div>

          </div>
        </div>
      </div>
      <div class="right"
        style="width: 365px;height: 90%;display: flex;flex-direction: column;justify-content: space-between;">
        <div class="everyDiv" style="height: 40%;">
          <div class="tit"><img src="@/assets/images/tit3.png" alt=""></div>
          <div class="cont"
            style="display: flex;flex-direction: column;justify-content: space-between;height: 100%;color: white;padding-top: 20px;padding-bottom: 20px; ">
            <div
              style="padding-left: 10px;display: flex;align-items: center;justify-content: space-between; padding-right: 20px">
              <img style="" src="@/assets/images/serve4.png" alt=""> <span
                style="font-size: 16px;font-weight: 700;">节省人力</span>
              <div style="display: flex;">
                <div class="timer" style="margin-right: 4px;"> <span> <span class="time" style="margin-right: 3px;">{{
                  getDays }}</span>天</span>
                </div>
                <div class="timer" style="margin-right: 4px;"><span> <span class="time" style="margin-right: 3px;">{{
                  getHours }}</span>时</span>
                </div>
                <div class="timer"><span> <span class="time" style="margin-right: 3px;">{{ getMinutes }}</span>分</span>
                </div>
              </div>
            </div>
            <div class="viewDiv1"> <span style="margin-bottom: 4px;display: flex;width: 100px; ">覆盖群众数</span> <span
                style="margin-left: 30px"> <span style="font-size:26px;font-weight: 700; ">{{ datas3.groupFriendCount
                  }}</span>人 </span> </div>
            <div class="viewDiv1 viewDiv2"> <span style="margin-bottom: 4px;display: flex;width: 100px;">服务群众人数</span>
              <span style="margin-left: 30px"> <span style="font-size:26px;font-weight: 700; ">{{ datas3.friendNameNum
                  }}</span>人 </span>
            </div>
            <div class="viewDiv1 viewDiv3"> <span style="margin-bottom: 4px;display: flex;width: 100px;">服务次数</span>
              <span style="margin-left: 30px"> <span style="font-size:26px;font-weight: 700; ">{{ datas3.totalServiceNum
                  }}</span>人 </span>
            </div>
          </div>
        </div>

        <div class="everyDiv" style="height: 25%">
          <div class="tit"><img src="@/assets/images/tit4.png" alt=""></div>
          <div class="everyCharts ec" :style="{
            width, height: height1,
            background
          }">
            <div ref="chartRef6" class="4434" :style="{ width, height: height1, background }"></div>
          </div>
        </div>
        <div class="everyDiv" style="height: 25%">

          <div class="tit"><img src="@/assets/images/tit5.png" alt=""></div>
          <div class="notice">
            <div class="top">
              <div class="left">
                <span><span class="num">{{ datas4 }}</span>次</span>
                <span>宣传</span>
              </div>
              <div class="right">
                <span><span class="num">{{ datas5 }}</span>次</span>
                <span>覆盖人</span>
              </div>
            </div>
            <div class="bottom">
              <span>AI状态</span>
              <div class="ai">
                <span class="ai1">{{ datas6 }}</span>
                <span class="ai2">在线AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { Ref, ref, watch, onBeforeUnmount, reactive, onMounted, computed } from 'vue';
import type { SelectProps } from 'ant-design-vue';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';
import { useUserStore } from '/@/store/modules/user';
import { defHttp } from '/@/utils/http/axios';
import img1 from '@/assets/images/wordBac1.png'
import img2 from '@/assets/images/wordBac2.png'
import img3 from '@/assets/images/wordBac3.png'
import img4 from '@/assets/images/wordBac4.png'
const { userInfo } = useUserStore();
import axios from 'axios';
// import * as echarts from 'echarts';
import 'echarts-wordcloud';

import Recorder from 'js-audio-recorder';

import { useECharts } from '/@/hooks/web/useECharts';

import 'ol/ol.css'

import { useRouter } from 'vue-router';

const router = useRouter();
const isInput = ref(true);
const currentTimeRef = ref(new Date());
const inputValue = ref('');
const uuid = ref('');
const shebei = ref(0)

const timer2 = ref(null)
const stopingNow = ref(false);
const chars = ref([]);

const audio = ref(null);
const isStarting = ref(0);
const timer4 = ref(null)
const replyArrays = ref([]);
const isStartings = ref(false);
const show = ref([]);
const NowPlayAudioIndex = ref(0);
const doubleCount = computed(() => chars.value);
const tianqi = ref({ text_day: '多云', high: 30, low: 20 })
const NoticeList = ref([])
const liveCanvas = ref(null);
const nowTime = ref(0);
const nowTime1 = ref(1);
const audioFileName = ref(''); // 用于上传的文件名
var recorder = new Recorder({
  sampleBits: 16, // 采样位数，支持 8 或 16，默认是16
  sampleRate: 16000, // 采样率，支持 11025、16000、22050、24000、44100、48000
  numChannels: 1, // 声道数，支持 1 或 2，默认是1
});
let app: PIXI.Application;
const props = defineProps({
  loading: Boolean,
  width: {
    type: String as PropType<string>,
    default: '100%',
  },
  height: {
    type: String as PropType<string>,
    default: '70%',
  },
  height2: {
    type: String as PropType<string>,
    default: '100%',
  },
  height1: {
    type: String as PropType<string>,
    default: '95%',
  },
  padding: {
    type: String as PropType<string>,
    default: '5%',
  },
  background: {
    type: String as PropType<string>,
    default: '',
  },
});
const chartRef = ref<HTMLDivElement | null>(null);
const chartRef2 = ref<HTMLDivElement | null>(null);
const chartRef3 = ref<HTMLDivElement | null>(null);
const chartRef4 = ref<HTMLDivElement | null>(null);
const chartRef5 = ref<HTMLDivElement | null>(null);
const chartRef6 = ref<HTMLDivElement | null>(null);
const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);
const { setOptions: setOptions2, echarts } = useECharts(chartRef2 as Ref<HTMLDivElement>);
const { setOptions: setOptions3 } = useECharts(chartRef3 as Ref<HTMLDivElement>);
const { setOptions: setOptions4 } = useECharts(chartRef4 as Ref<HTMLDivElement>);
const { setOptions: setOptions5 } = useECharts(chartRef5 as Ref<HTMLDivElement>);
const data1 = ref([])
const key = reactive({
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(0,0,0,0.73)',
    borderColor: '#00527B',
    borderRadius: 4,
    textStyle: {
      fontSize: 12,
      fontFamily: 'Microsoft YaHei',
      fontWeight: 400,
      color: '#FFFFFF',
      height: 12,

    },
    formatter: '{c}%'
  },
  legend: {
    left: '60%', // 图例组件离容器左侧的距离
    top: '18%', // 图例组件离容器顶部的距离
    selectedMode: false, // 图例选择的模式，控制是否可以通过点击图例改变系列的显示状态
    icon: "circle",
    itemGap: 20,
    // formatter: '{value|{d}%}\n{name|{b}}',

    textStyle: {
      color: '#FFFFFF',

      rich: {
        name: {
          fontSize: 14,
          color: '#B4C0CC'
        },
        value: {
          fontSize: 22,
          fontWeight: 700,
          color: '#FFFFFF'
        }
      },
    },
  },
  title: [
    { // 第一个圆环标题
      // text: '640', // 主标题
      textStyle: { // 主标题样式
        color: '#FFFFFF',
        fontWeight: 400,
        fontSize: '16px'
      },
      left: '25%', // 定位到适合的位置
      top: '43%', // 定位到适合的位置
      // subtext: '计划投资金额', // 副标题
      subtextStyle: { // 副标题样式
        color: 'rgba(0,0,0,0.73)',
        fontSize: '14px',
        fontWeight: 400
      },
      textAlign: 'center', // 主、副标题水平居中显示
    },
  ],
  series: [
    {
      name: '外圆',
      type: 'pie',
      radius: ['50%', '60%'],
      center: ['27%', '44%'],

      minAngle: 5, // 最小的扇区角度（0 ~ 360），用于防止某个值过小导致扇区太小影响交互
      avoidLabelOverlap: false,
      label: {
        show: false,
        color: 'white',
        fontSize: 22,
        fontWeight: 700,
        position: 'center', // 设置标签在中心显示]
        formatter: '{value|{d}%}\n{name|{b}}',
        rich: {
          name: {
            fontSize: 14,
            color: '#B4C0CC'
          },
          value: {
            fontSize: 22,
            fontWeight: 700,
            color: '#FFFFFF'
          }
        },
      },

      itemStyle: {
        borderRadius: 0,
        borderColor: '#000',
        borderWidth: 7
      },
      emphasis: {
        scale: true,//鼠标划上不展示高亮放大效果
        label: {
          show: true,

        }
      },
      labelLine: {
        show: false,
      },
      data: [
        {
          value: 1200, name: '高速公路',
          itemStyle: {
            color: '#1FC6FF',
            opacity: 0.9
          },
        },
        {
          value: 400, name: '国省干线',
          itemStyle: {
            color: '#59FFC3',
            opacity: 0.9
          },
        },
        {
          value: 400, name: '农村公路',
          itemStyle: {
            color: '#FFFFFF',
            opacity: 0.9
          },
        },

      ]
    },
    {
      name: '内圆',
      type: 'pie',
      silent: true,
      radius: ['36%', '49%'],
      center: ['27%', '44%'],

      avoidLabelOverlap: false,
      itemStyle: {
        // borderRadius: 10,
        borderColor: '#000',
        borderWidth: 4
      },
      label: {
        show: false,

      },
      emphasis: {
        scale: true,//鼠标划上不展示高亮放大效果
        label: {
          show: false,
        }
      },
      labelLine: {
        show: false
      },
      data: [
        {
          value: 1200, name: '高速公路',
          itemStyle: {
            color: '#1FC6FF40',
          }
        },
        {
          value: 400, name: '国省干线',
          itemStyle: {
            color: '#FFFFFF40',
          }
        },
        {
          value: 400, name: '农村公路',
          itemStyle: {
            color: '#FFFFFF40',
          }
        },
      ]
    },
  ]

});
const key2 = reactive({

  legend: {
    top: 'bottom',
    show: false // 设置图例不显示
  },

  series: [{

    name: 'Nightingale Chart',
    type: 'pie',
    radius: [20, "60%"],
    center: ['50%', '35%'],
    roseType: 'area',
    // label: {
    //   normal: {
    //     show: true,
    //     textStyle: {
    //       fontSize: 18
    //     }
    //   },
    //   "emphasis": {
    //     "show": true
    //   }
    // },
    labelLine: {
      normal: {
        length: 30, //第一条线
        // length2: 30, //第二条线
        lineStyle: {
          width: 1, // 线条的宽度
          color: "#E1E1E1", //线的颜色设置， 如没有设置颜色则线条的颜色跟随饼状图的颜色
        }

      }
    },
    itemStyle: {


    },
    label: {
      normal: {

        show: true,
        textStyle: {
          fontSize: 18,
          color: '#B4C0CC' // 这里设置标签文字颜色为红色
        },

      }
    },
    data: [
      {
        value: 235, name: '视频广告', itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 1, 1, 1, [
            { offset: 0.2, color: '#59F4F4' },
            { offset: 0.8, color: '#B5DEDE' }
          ]),
        }
      },
      { value: 274, name: '联盟广告', itemStyle: { color: '#1e90ff' } },
      { value: 310, name: '邮件营销', itemStyle: { color: '#32cd32' } },

    ],

  }
  ]
})
const data11 = ref([323, 122, 123, 123])
const data12 = ref([333, 222, 132, 151])
const data13 = ref([123, 321, 231, 111])
var dataTotal = data11.value.map((item, index) => item + data12.value[index] + data13.value[index]);
const { setOptions: setOptions6 } = useECharts(chartRef6 as Ref<HTMLDivElement>);
var data = ref([]);
let symbolUrl = 'data:image/png;base64,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'
var maskImage = new Image();
maskImage.src = symbolUrl;
//当前时间
const currentTime = ref('')
const timer1 = ref('')
function appendZero(obj) {
  if (obj < 10) {
    return "0" + obj;
  } else {
    return obj;
  }
}
const startRecording = () => {
  if (isStarting.value != 0) {
    return;
  }
  show.value = [];
  chars.value = [];
  stopingNow.value = false;
  uuid.value = generateRandomString(16);

  console.log(recorder.getWAVBlob(), 11);
  // alert('none')
  recorder
    .start()
    .then(() => {
      console.log('开始录音了');
      isStarting.value = 1;
      isRecording.value = true;
    })
    .catch((error) => {
      // alert(error)
    });
};

const stopRecording = () => {
  // alert(1111)
  if (isStarting.value != 1) {
    return;
  }
  recorder.stop();
  // 导出WAV文件

  // 获取 WAV 格式的数据
  let wavBlob = recorder.getWAVBlob();
  console.log(wavBlob, 22222);

  const uploadUrls = '/sys/common/upload';
  audioFileName.value = `recording_${Date.now()}.wav`;
  uploadAudio(wavBlob, uploadUrls);
  isStarting.value = 3;
  // types.value = 1;
};
const uploadAudio = (audioBlob, uploadUrl) => {
  if (!audioBlob) return;

  const formData = new FormData();

  formData.append('file', audioBlob, audioFileName.value);
  formData.append('biz', 'temp');
  //
  // forEach 方式
  formData.forEach((value, key) => {
    console.log(key, value);
  });
  let headers = {
    'Content-Type': 'multipart/form-data;boundary = ' + new Date().getTime(),
  };
  defHttp
    .post({ url: '/sys/common/upload', params: formData, headers }, { isTransformResponse: false })
    .then((res) => {
      // console.log(res.message, 1312);
      uuid.value = generateRandomString(16);
      let par = {
        contentId: uuid.value,
        fileLink: res.message,
      };
      let par2 = {
        fileLink: res.message,
        seq: uuid.value
      }

      let par1 = {
        word: '抱歉，我没能明白您的意思。您可以尝试问我一些办事指南、社区服务等相关问题，例如：医保怎么办理。当然小邡也会不断学习更多知识来完善自己的！',
      };
      defHttp.post({ url: '/ai/shequnAiVoice/voiceToText', params: par2 }).then(ress => {
        console.log(ress, 122121);
        let params = {
          seq: uuid.value,
          content: ress,
          appType: "15"
        }
        defHttp.post({ url: '/fastGpt/sendFastGpt', params }, { isTransformResponse: false }).then((ress) => {
          if (ress.code == 500) {
            alert('语音解析失败');
            return;
          } else {
            //机器人咨询
            // NowPlayAudioIndex.value = 0;
            // replyArrays.value = [];
            // isStarting.value = 3;
            // isInput.value = false;
            // inputValue.value = '';
            // chars.value = [];
            // show.value = [];
            // stopingNow.value = false
            // getReply();
            isStartings.value = true;
            stopingNow.value = true
            isStarting.value = 0;
            express('1');

            let par = {
              word: ress.result
            }
            if (timer2.value) {
              clearInterval(timer2.value);
            }
            chars.value = ress.result.split('')
            chars.value.forEach((_, index) => {
              setTimeout(() => {
                // console.log(nowLength, chars.value, show.value, replyArrays.value, 1111111111111111122);
                show.value[index] = true;
              }, delay);
              delay += interval;
            });

            defHttp.get({ url: '/ai/shequnAiVoice/textToVoice', params: par }).then(re => {
              console.log(re, 12121);

              audio.value = new Audio(re);
              audio.value.play();
              audio.value.addEventListener('play', handlePlay);
              audio.value.addEventListener('ended', handleEnded);
            })
            //数据查询
            console.log(ress.result, 231232131);


          }
          // playAudio()
        });
      })
      
    })
    .catch((err) => {
      console.log(err, 13122);
    });
  console.log(formData, 111);
};
function changeTime(index: number) {
  console.log(index, 11112121211, datas1.value.allEventTypeList);

  nowTime.value = index
  var colors = [new echarts.graphic.LinearGradient(0, 1, 1, 1,
    [
      { offset: 0, color: 'rgba(36, 182, 255, 0.2)' },
      { offset: 1, color: 'rgba(36, 182, 255, 1)' },
    ]
  ), new echarts.graphic.LinearGradient(0, 1, 1, 1,
    [
      { offset: 0, color: 'rgba(221, 175, 96, 0.2)' },
      { offset: 1, color: 'rgba(221, 175, 96, 1)' },
    ]
  ), new echarts.graphic.LinearGradient(0, 1, 1, 1,
    [
      { offset: 0, color: 'rgba(0, 215, 223, 0.2)' },
      { offset: 1, color: 'rgba(0, 215, 223, 1)' },
    ]
  ),
  new echarts.graphic.LinearGradient(0, 1, 1, 1,
    [
      { offset: 0, color: 'rgba(221, 175, 96, 0.5)' },
      { offset: 1, color: 'rgba(221, 175, 96, 1)' },
    ]
  ),
  new echarts.graphic.LinearGradient(0, 1, 1, 1,
    [
      { offset: 0, color: 'rgba(18, 191, 111, 0.5)' },
      { offset: 1, color: 'rgba(18, 191, 111, 1)' },
    ]
  )]
  var b = 0
  if (index == 0) {
    var datas = []

    for (var i in datas1.value.allEventTypeList) {
      if (b < 3) {
        console.log(i, datas1.value.allEventTypeList[i]);

        let a = {
          name: i,
          value: Math.pow(datas1.value.allEventTypeList[i], 0.3),
          itemStyle: { color: colors[b] }
        }
        datas.push(a)
        b++
      }
    }
    console.log(datas, 213123, datas1.value.allEventTypeList);
    key2.series[0].data = datas
    if (datas.length > 0) {
      setOptions2(key2)
    }
    else {
      setOptions2({})
    }
  }
  else if (index == 1) {

    var datas = []
    for (var i in datas1.value.noSolveEventTypeList) {
      if (b < 3) {
        console.log(i, datas1.value.noSolveEventTypeList[i], 43433433);

        let a = {
          name: i,
          value: datas1.value.noSolveEventTypeList[i], itemStyle: { color: colors[b] }
        }
        datas.push(a)
        b++
      }
    }
    console.log(datas, 213123, datas1.value.noSolveEventTypeList);
    key2.series[0].data = datas
    if (datas.length > 0) {
      setOptions2(key2)
    }
    else {
      setOptions2({})
    }
  }
  else {

    var datas = []
    for (var i in datas1.value.solveEventTypeList) {
      if (b < 3) {
        console.log(i, datas1.value.solveEventTypeList[i]);

        let a = {
          name: i,
          value: datas1.value.solveEventTypeList[i], itemStyle: { color: colors[b] }
        }
        datas.push(a)
        b++
      }
    }
    console.log(datas, 213123, datas1.value.solveEventTypeList);
    key2.series[0].data = datas
    if (datas.length > 0) {
      setOptions2(key2)
    }
    else {
      setOptions2({})
    }
  }
  console.log(index);


}
function changeTime1(index: number) {
  nowTime1.value = index
  console.log(index, datas2.value, 2131231231);
  var colors = ['#1FC6FF', '#4FF591', '#FFFFFF', '#E1E1E1', '#64A8E7']
  var c = 0
  if (index == 1) {
    var datas = []
    var datas3 = []
    for (var i in datas2.value.replyMap) {
      if (c < 5) {
        console.log(i, datas2.value.replyMap[i]);

        let a = {
          name: i,
          value: datas2.value.replyMap[i],
          itemStyle: {
            color: colors[c],
          }
        }
        let b = {
          name: i,
          value: datas2.value.replyMap[i],
          itemStyle: {
            color: '#FFFFFF40',
          }

        }
        datas.push(a)
        datas3.push(b)
        c++
      }
    }
    key.series[0].data = datas
    key.series[1].data = datas3
    if (datas.length > 0) {
      setOptions(key)
    }
    else {
      setOptions({})
    }
  }
  else {
    var datas = []
    var datas3 = []
    for (var i in datas2.value.noReplyMap) {
      if (c < 5) {
        console.log(i, datas2.value.noReplyMap[i]);

        let a = {
          name: i,
          value: datas2.value.noReplyMap[i],
          itemStyle: {
            color: colors[c],
          }
        }
        let b = {
          name: i,
          value: datas2.value.noReplyMap[i],
          itemStyle: {
            color: '#FFFFFF40',
          }

        }
        datas.push(a)
        datas3.push(b)
        c++
      }
    }
    key.series[0].data = datas
    key.series[1].data = datas3
    if (datas.length > 0) {
      setOptions(key)
    }
    else {
      setOptions({})
    }
  }

}
function gohome1() {


  setTimeout(() => {
    router.push('/home');
  }, 1000);
}
timer1.value = setInterval(() => {
  var y = new Date().getFullYear();
  var m = appendZero(new Date().getMonth() + 1);
  var d = appendZero(new Date().getDate());
  var ho = appendZero(new Date().getHours());
  var mi = appendZero(new Date().getMinutes());
  var se = appendZero(new Date().getSeconds());
  //修改数据date
  currentTime.value = y + "-" + m + '-' + d + ' ' + ho + ':' + mi + ':' + se;


}, 1000);
onBeforeUnmount(() => {

  clearInterval(timer1.value)
})



// Parametric curve
for (var t = 0; t < 25; t += 0.001) {
  var x = (1 + 0.25 * Math.cos(75 * t)) * Math.cos(t);
  var y = (1 + 0.25 * Math.cos(75 * t)) * Math.sin(t);
  var z = t + 2.0 * Math.sin(75 * t);
  data.value.push([x, y, z]);
}
console.log(data.length);
data1.value = [
  { value: 1081, name: '指挥中心' },
  { value: 735, name: '领导交办' }
]
watch(
  () => props.loading,
  () => {
    if (props.loading) {

      return;
    }
    // setOptions(key);
    // setOptions2(key2);
    setOptions3({
      tooltip: {
        trigger: 'item',

      },
      legend: {
        bottom: '1%',
        left: 'center',
      },
      series: [
        {
          color: ['#5ab1ef', '#b6a2de', '#67e0e3', '#2ec7c9'],
          name: '访问来源',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '12',
              fontWeight: 'bold',
            },
          },
          labelLine: {
            show: false,
          },
          data: [
            { value: 848, name: '搜索引擎' },
            { value: 415, name: '直接访问' },
            { value: 580, name: '邮件营销' },
            { value: 484, name: '联盟广告' },
          ],
          animationType: 'scale',
          animationEasing: 'exponentialInOut',
          animationDelay: function () {
            return Math.random() * 100;
          },
        },
      ],
    });

    setOptions5({
      tooltip: {
        trigger: 'item',
      },
      legend: {
        top: '3%',
        right: '1%',
        textStyle: {
          color: 'white',
        },
        orient: 'vertical',
      },
      series: [
        {
          top: '-10%',
          color: ['#C8B9F0', '#3485FF'],
          name: 'Access From',
          type: 'pie',
          radius: ['50%', '70%'],
          // center: ['50%', '40%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 30,
              fontWeight: 'bold'
            },
            itemStyle: {
              borderWidth: 100,
              // borderColor: '#ffffff'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: 1048, name: '指挥中心' },
            { value: 735, name: '领导交办' },

          ]
        }
      ],
    });
    setOptions6({
      series: [{
        type: 'wordCloud',
        // shape这个属性虽然可配置，但是在词的数量不太多的时候，效果不明显，它会趋向于画一个椭圆
        shape: 'circle',

        // 这个功能没用过
        keepAspect: false,
        // maskImage这个是可以自定义背景图片的，词云会按照图片的形状排布，所以有形状限制的时候，最好用背景图来实现，而且，这个背景图一定要放base64的，不然词云画不出来


        // 下面就是位置的配置
        left: 'center',
        top: 'center',
        width: '100%',
        height: '100%',
        right: null,
        bottom: null,
        // 词的大小，最小12px，最大60px，可以在这个范围调整词的大小
        sizeRange: [12, 28],
        // 每个词旋转的角度范围
        rotationRange: [0, 0],
        rotationStep: 100,
        // 词间距，数值越小，间距越小，这里间距太小的话，会出现大词把小词套住的情况，比如一个大的口字，中间会有比较大的空隙，这时候他会把一些很小的字放在口字里面，这样的话，鼠标就无法选中里面的那个小字
        gridSize: 50,
        // 允许词太大的时候，超出画布的范围
        drawOutOfBound: false,
        // 布局的时候是否有动画
        layoutAnimation: true,
        // 这是全局的文字样式，相对应的还可以对每个词设置字体样式
        textStyle: {

          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          // padding:[10,5,30,0],
          // 颜色可以用一个函数来返回字符串
          color: function () {
            const min = 160; // 设置最低亮度
            const max = 255; //
            // Random color
            // return 'rgb(' + [
            //   Math.round(Math.random() * 160),
            //   Math.round(Math.random() * 160),
            //   Math.round(Math.random() * 160)
            // ].join(',') + ')';
            return 'white'
          },
          backgroundColor: {
            image: img4, // 背景图片的 URL
            repeat: 'no-repeat', // 背景图片不重复
            height: 100,
            width: 100,
            padding: [20, 30, 40, 50]

          }
        },
        emphasis: {
          focus: 'self',
          textStyle: {
            textShadowBlur: 10,
            textShadowColor: '#333'
          }
        },

        // 数据必须是一个数组，数组是对象，对象必须有name和value属性
        data: [
          {
            name: '低保',
            value: 120,
            textStyle: {
              color: 'white',

              padding: [10, 5, 30, 5],

              backgroundColor: {
                image: img2, // 背景图片的 URL
                repeat: 'no-repeat', // 背景图片不重复
                height: 100,
                width: 100,


              }
            }
          },
          {
            name: '残疾',
            value: 36,
            textStyle: {
              color: 'white',

              padding: [10, 5, 20, 5],

              backgroundColor: {
                image: img3, // 背景图片的 URL
                repeat: 'no-repeat', // 背景图片不重复
                height: 100,
                width: 100,


              }
            }
          },
          {
            name: '身份证',
            value: 26,
            textStyle: {
              color: 'white',

              padding: [20, 5, 20, 5],

              backgroundColor: {
                image: img4, // 背景图片的 URL
                repeat: 'no-repeat', // 背景图片不重复
                height: 100,
                width: 100,


              }
            }
          },
          {
            name: '着火',
            value: 191,

            textStyle: {
              color: 'white',

              padding: [10, 5, 40, 5],

              backgroundColor: {
                image: img1, // 背景图片的 URL
                repeat: 'no-repeat', // 背景图片不重复
                height: 100,
                width: 100,


              }
            }
          },
          {
            name: '收入',
            value: 18,
            textStyle: {
              color: 'white',

              padding: [10, 5, 20, 5],

              backgroundColor: {
                image: img4, // 背景图片的 URL
                repeat: 'no-repeat', // 背景图片不重复
                height: 100,
                width: 100,


              }
            }
          },
          {
            name: '打架',
            value: 16,
            textStyle: {
              color: 'white',

              padding: [10, 5, 20, 5],

              backgroundColor: {
                image: img4, // 背景图片的 URL
                repeat: 'no-repeat', // 背景图片不重复
                height: 100,
                width: 100,


              }
            }
          },

        ]
      }]
    });
  },

  { immediate: true }
);
function sendMessage() {
  if (inputValue.value == '') {
    alert('请输入您想咨询的内容')
    return
  }
  uuid.value = generateRandomString(16);
  let params = {
    seq: uuid.value,
    content: inputValue.value,
    appType: "15"
  };
  //数据查询
  NowPlayAudioIndex.value = 0;
  replyArrays.value = [];
  isStarting.value = 3;
  isInput.value = false;
  inputValue.value = '';
  chars.value = [];
  show.value = [];
  stopingNow.value = false
  defHttp.post({ url: '/fastGpt/sendFastGpt', params }, { isTransformResponse: false }).then((ress) => {
    if (ress.code == 500) {
      alert('语音解析失败');
      return;
    } else {
      //机器人咨询
      // NowPlayAudioIndex.value = 0;
      // replyArrays.value = [];
      // isStarting.value = 3;
      // isInput.value = false;
      // inputValue.value = '';
      // chars.value = [];
      // show.value = [];
      // stopingNow.value = false
      // getReply();
      isStartings.value = true;
      stopingNow.value = true
      isStarting.value = 0;
      express('1');

      let par = {
        word: ress.result
      }
      if (timer2.value) {
        clearInterval(timer2.value);
      }
      chars.value = ress.result.split('')
      chars.value.forEach((_, index) => {
        setTimeout(() => {
          // console.log(nowLength, chars.value, show.value, replyArrays.value, 1111111111111111122);
          show.value[index] = true;
        }, delay);
        delay += interval;
      });
      timer2.value = setInterval(() => {
        express('1');
      }, 100);
      defHttp.get({ url: '/ai/shequnAiVoice/textToVoice', params: par }).then(re => {
        console.log(re, 12121);

        audio.value = new Audio(re);
        audio.value.play();
        audio.value.addEventListener('play', handlePlay);
        audio.value.addEventListener('ended', handleEnded);
      })
      //数据查询
      console.log(ress.result, 231232131);


    }
    // playAudio()
  });
}
let model
const getDays = ref(0);
const getHours = ref(0);
const getMinutes = ref(0)
const datas1 = ref('')
const datas2 = ref('')
const datas3 = ref('')
const datas4 = ref('')
const datas5 = ref('')
const datas6 = ref('')
function convertMinutesToHoursAndMinutes(minutes) {


  // 将小时数转换为天数和小时数
  var days = Math.floor(minutes / (24 * 60));
  var hours = Math.floor((minutes % (24 * 60)) / 60);
  var remainingMinutes = minutes % 60;
  getDays.value = days
  getHours.value = hours
  getMinutes.value = remainingMinutes
}
onMounted(() => {
  let par = {
    pUserId: userInfo.id
  }
  defHttp.get({ url: "/user/shequnAreaUser/queryByUserId", params: par }).then(res => {
    let params = {

    }

    console.log(userInfo, 21121212);
    if (userInfo.username == 'admin') {
      params = {
        areaId: res.areaId,
        isRoot: true
      }
    }
    else {
      if (res != null) {
        params = {
          areaId: res.areaId,
          isRoot: false
        }

      }
    }
    if (isTablet()) {
      shebei.value = 1
    } else {
      shebei.value = 0
    }
    defHttp.get({ url: "/event/eventManager/queryAllEventNum", params }).then(res => {
      if(res!=null){
        datas1.value = res
        changeTime(0)
      }
     
    })
    defHttp.get({ url: "/consultation/consultationManager/queryAllConsulationNum", params }).then(res => {
      console.log(res, 12312321312312);
      if(res!=null){
        datas2.value = res
        changeTime1(1)
      }
  
    }).catch(err => {
      console.log(err, 231231231231);

    })
    defHttp.get({ url: "/wechat/wechatUser/queryAllGroupNum", params }).then(res => {
      console.log(res, 32432432423423423);

      convertMinutesToHoursAndMinutes(res.totalServiceNum * 5)
      datas3.value = res
    }).catch(err => {
      console.log(err, 231231231231);

    })
    defHttp.get({ url: "/webfastgpt/shequnWebFastgpt/queryAllWebNum" }).then(res => {

      datas4.value = res
    })
    defHttp.get({ url: "/webfastgpt/shequnWebFastgpt/getOpenSize" }).then(res => {
      console.log(res, 12312321312312);
      if (res == null) {
        datas5.value = 0
        return
      }
      datas5.value = res
    })
    defHttp.get({ url: "/qrcode/qrCode/queryQrCodeNum" }).then(res => {

      datas6.value = res
    })
  })


  timer4.value = setInterval(() => {
    currentTimeRef.value = new Date()
  }, 1000);
  defHttp.get({ url: "/notice/shequnNotice/list?column=createTime&order=desc&pageNo=1&pageSize=10&_t=1716450022872" }).then(res => {
    NoticeList.value = res.records
  })
  axios.get('https://gfapi.mlogcn.com/weather/v001/day?areacode=101272001&days=1&key=OuOztCMhRiMIuA27o6bQ0mYU4DALvS6B').then((res) => {
    console.log(101272001, res.data.result.daily_fcsts[0], 101272001);
    tianqi.value = res.data.result.daily_fcsts[0]
  });

  // alert(Live2DModel.length)
  app = new PIXI.Application({
    view: liveCanvas.value || null,
    autoStart: true,
    resizeTo: window,
    backgroundAlpha: 0,
  });
  const text = new PIXI.Text('Hello, PIXI!');
  // app.stage.addChild(text);
  // app.stage.addChild(text);
  Live2DModel.from('/robot/robot.model3.json')
    .then((models) => {
      // 在这里将模型添加到渲染场景中
      model = models;
      model.anchor.set(0.5, 0.5);
      model.on('motionStart', (motionName) => {

      });

      model.on('motionEnd', (motionName) => {

      });
      // 将模型的位置设置为屏幕中心
      const centerX = app.screen.width / 2;
      const centerY = app.screen.height / 2;
      window.addEventListener('resize', () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        keepModelCentered(model);
      });
      model.x = centerX;
      model.y = centerY;

      app.stage.addChild(model);
      model.scale.set(0.6);
    })
    .catch((err) => {
      alert(err);
    });
});
function keepModelCentered(model) {
  model.x = app.screen.width / 2;
  model.y = app.screen.height / 2;
}
function isTablet() {
  const width = window.innerWidth
  // 平板通常比电脑小，但是也有一些边界情况
  const maxTabletWidth = 1200 // 可以根据需要调整这个值
  const minDesktopWidth = 1201 // 最小的电脑宽度是1201像素
  return width > maxTabletWidth ? false : width <= minDesktopWidth
}
function generateRandomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
let delay = 0;
const interval = 200; // 每个字符之间的时间间隔
function getReply() {
  let params = {
    isSend: 1,
    pageSize: 50,
    contentId: uuid.value,
  };
  // timer.value = setInterval(() => {
  defHttp.get({ url: '/apply/shequnVoiceApply/list', params }).then((res) => {
    if (stopingNow.value == false) {

      replyArrays.value = res.records;
      //  audio.value = new Audio('/warn.wav');
      // // 模型加载成功
      // audio.value.play()
      if (res.records.length > 0) {
        if (res.records[0].applyContent == '已已完结') {
          audio.value = new Audio('https://shequn023.oss-cn-chengdu.aliyuncs.com/temp/1_1716547082942.mp3');
          audio.value.play();
          isStarting.value = 2
          audio.value.addEventListener('ended', handleEnded2);

          return;
        }
        isStarting.value = 2;
        if (isStartings.value == false) {
          go();
        }
        if (res.records[res.records.length - 1].applyContent == '已已完结') {

          let par = {
            contentId: uuid.value,
          };
          defHttp.delete({ url: '/apply/shequnVoiceApply/deleteByContentId?contentId=' + uuid.value });
          if (res.records[0].applyContent == '已已完结') {
            isStarting.value = 1;
          }
          return;
        } else {
          setTimeout(() => {
            getReply();
          }, 1500);
        }
      } else {
        setTimeout(() => {


          audio.value = new Audio('https://shequn023.oss-cn-chengdu.aliyuncs.com/temp/1_1716287400215.mp3');
          audio.value.play();
          audio.value.addEventListener('ended', handleEnded1);
        }, 1500);
      }
    } else {
      return;
    }
  });
  // }, 3000);
}
function handleEnded1() {
  getReply();
}
function express(type: string) {
  model.motion('Start', 1).then((res) => { });

}
function go() {
  isStartings.value = true;
  express('1');
  const audioObjectURL = replyArrays.value[NowPlayAudioIndex.value].voiceContentBase64;
  audio.value = new Audio(audioObjectURL);
  // 播放音频
  audio.value.play();
  audio.value.addEventListener('play', handlePlay);
  audio.value.addEventListener('ended', handleEnded);
}

function handlePlay() {
  delay = 0;
  isStarting.value = 2;
  if (timer2.value) {
    clearInterval(timer2.value);
  }
  // const charss = replyArrays.value[NowPlayAudioIndex.value].applyContent.split('');
  // const nowLength = chars.value.length;
  // chars.value = chars.value.concat(charss);
  // const shows = new Array(charss.length).fill(false);
  // show.value = show.value.concat(shows);
  // // 逐个设置淡入状态
  // charss.forEach((_, index) => {
  //   setTimeout(() => {

  //     show.value[index + nowLength] = true;
  //   }, delay);
  //   delay += interval;
  // });
  timer2.value = setInterval(() => {
    express('1');
  }, 600);
}

function handleEnded2() {
  isStarting.value = 0;
}
function handleEnded() {

  isStarting.value = 3;
  if (timer2.value) {
    clearInterval(timer2.value);
  }

  if (NowPlayAudioIndex.value < replyArrays.value.length - 2) {
    NowPlayAudioIndex.value++;
    go();
  } else {
    test();
  }
}
function test() {
  setTimeout(() => {
    if (NowPlayAudioIndex.value < replyArrays.value.length - 2) {
      NowPlayAudioIndex.value++;
      go();
    } else {
      console.log('真完结了，111111111111111111111111111111111111111111111111');

      isStartings.value = false;
      isStarting.value = 0;
    }
  }, 1000);
}
function changeStatus() {
  if (isStarting.value == 0) {
    isInput.value = !isInput.value;
  }
}

</script>

<style lang="less" scoped>
.kanban .titles {
  // /* background-image: url('@/assets/images/topBac.png'); */
  // background-image: url('@/assets/images/fuwu3.png');
  background-size: cover;
}

.kanban .title {

  text-align: center;
  color: #fff;


  text-align: center;
  font-family: Source Han Sans CN;
  font-size: 46px;
  font-style: italic;

  font-weight: 700;
  line-height: normal;
  letter-spacing: 8px;
  background: linear-gradient(180deg, #FFF 16.67%, #BDD5EE 80%);
  /* background-color: yellow; */
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  img {
    cursor: pointer;
    margin-right: 1vh;
    width: 15vh;
    margin-bottom: 1vh;
  }
}

.everyCharts {
  //border: 1px solid #3A6FBB;
}

.tits {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 46px;
  font-size: 18px;
  color: white;
  font-weight: 700;
  background-image: url('@/assets/images/smallTit.png');
  background-size: 100%;
  // background-color: #002153;
}

.ant-select-dropdown {
  z-index: 9999 !important;
}

.blueLayer {
  filter: grayscale(100%) sepia(41%) invert(100%) saturate(350%);
}



.kanban .ant-select-selector {
  background-color: #010D27 !important;
  color: white !important;
}

.kanban {
  background-image: url('@/assets/images/bac43.png');
  background-size: 100% 100%;
}

.backTo {
  cursor: pointer;
  background-image: url('@/assets/images/Features.png');
  background-repeat: no-repeat;
  /* 防止图片重复显示 */
  background-position: center;
  /* 将图片位于容器的中心点 */
}

.backTo:hover {
  background-image: url('@/assets/images/Features.png');
}

.kanban .ant-select-selection-item {
  color: white !important;
}



.tdt-infowindow-content-wrapper {
  border-radius: 10px;
}

.everyDiv {
  height: 45%;
  flex-grow: 0;
  flex-shrink: 0;
}

.typing-container {
  width: 100%;
  height: 300px;
  border-radius: 4px;
  padding-top: 50px !important;
  // background-color: #2186b1;
  background-size: 100% 100%;
  padding: 40px;
  background-image: url('@/assets/images/speakBac.png');
  overflow: auto;
  // background-color: rgba(255, 255, 255, 1) !important;
  font-size: 16px;
}

.typing-containers {
  width: 100%;
  height: 300px;
  border-radius: 4px;
  padding-top: 50px !important;
}

.typing-container .char {
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
}

.fade-in {
  color: white;
  opacity: 1 !important;
}

.speakDiv {
  background-size: 100% 100%;
  background-image: url('@/assets/images/speakB.png');
  height: 60px;
  width: 470px;
  // background-color: #116ca0;
  // opacity: 0.5;
  border-radius: 4px;
  margin-top: 8%;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .send {
    width: 100px;
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(180deg, #76FFF7 23.96%, #71F3ED 23.96%, #478F99 56%);
    display: flex;
    justify-content: center;
    align-items: center;
    margin-left: 10px;
    color: white;
    font-size: 16px;
    cursor: pointer;
  }

  .speakChange {
    width: 60px;
    height: 40px;
    border-radius: 4px;
    // border: 1px solid white;
    margin-right: 10px;
    flex-grow: 0;
    flex-shrink: 0;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #808080;
    background: linear-gradient(180deg, #76FFF7 23.96%, #71F3ED 23.96%, #478F99 56%);
    background-size: 100% 100%;
    position: relative;
    color: white;

    // opacity: 0.8;
    .mask {}

    img {
      width: 40px;
      height: 28px;
    }
  }

  .speakCenter {
    cursor: pointer;
    background-size: 100% 100%;

    height: 100%;
    width: 100%;
    border-radius: 4px;
    border: 1px solid #808080;

    display: flex;
    justify-content: center;
    align-items: center;

    span {
      color: white;
      font-size: 18px;
    }
  }
}

.tit {
  img {
    // width: 100%;
    height: 100%;
  }
}

.lefts1 {
  background-image: url('@/assets/images/left2.png');
  background-size: 100% 100%;
  font-size: 20px;
  color: white;
}

.rights11,
.rights12 {
  width: 214px;
  height: 52px;
  background-image: url('@/assets/kanban/right2.png');
  background-size: 100% 100%;
}

.rights11,
.rights12 {
  display: flex;
  align-items: center;
  padding-left: 55px;

  span {
    color: #FFFFFFB2;

  }

  .num {
    color: #3CD8E3 !important;
    font-size: 26px;
    font-weight: 700;
  }
}

.rights12 {
  background-image: url('@/assets/kanban/right1.png');
}

.rights1 {
  height: 120px;
  display: flex;
  flex-direction: column;
  color: white;
  justify-content: space-between;
}

.nowTime {
  div {
    width: 40px;
    height: 20px;
    background-image: url("@/assets/images/yeqian2.png");
    background-size: 100% 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 12px;
    cursor: pointer;
  }

  .nowMonth,
  .nowYear {
    width: 60px;
  }

  .active {
    background-image: url("@/assets/images/yeqian1.png");
  }
}

.chart2 {
  .cent {
    background-image: url("@/assets/images/serve3.png");
    background-size: 100% 100%;
    padding-top: 5px;
    padding-bottom: 5px;
  }

  .cent1 {
    background-image: url("@/assets/images/serve1.png");
    background-size: 100% 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding-bottom: 12px;
  }

  .cent2 {
    background-image: url("@/assets/images/serve2.png");
  }
}

.timer {
  width: 58px;
  height: 50px;
  background-image: url("@/assets/images/serve5.png");
  display: flex;
  justify-content: center;
  align-items: center;

  .time {
    background: linear-gradient(180deg, #FFFFFF 23.96%, #54A9FF 100%);
    -webkit-background-clip: text;
    /*将设置的背景颜色限制在文字中*/
    -webkit-text-fill-color: transparent;
    font-size: 22px;
    font-weight: 900;
  }
}

.viewDiv1 {
  height: 70px;
  width: 100%;
  background-image: url("@/assets/images/serve7.png");
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  padding-bottom: 10px;
  font-size: 16px;
  background-size: 100% 100%;
}

.viewDiv2 {
  background-image: url("@/assets/images/serve8.png");
}

.viewDiv3 {
  background-image: url("@/assets/images/serve6.png");
}

.notice {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  padding-bottom: 40px;

  .top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30px;

    .left,
    .right {
      width: 150px;
      height: 70px;
      background-image: url("@/assets/images/notice1.png");
      background-size: 100% 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;

      span {
        font-size: 16px;
        color: white;
      }

      .num {
        font-size: 22px;
        font-weight: 700;
      }
    }

    .right {
      background-image: url("@/assets/images/notice2.png");
    }

  }

  .bottom {
    width: 100%;
    height: 80px;
    background-image: url("@/assets/images/notice3.png");
    background-size: 100% 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-left: 80px;
    padding-right: 40px;
    color: white;
    font-size: 16px;

    .ai {
      display: flex;
      flex-direction: column;

      .ai1 {
        font-size: 26px;
        font-weight: 700;
      }

      .ai2 {
        color: #E1E1E1;
      }
    }
  }
}

.weather {
  color: white;
  font-size: 16px !important;
}
#input111{
  background-color: #16222E;
  color: white;
  opacity: 0.5;
}
</style>