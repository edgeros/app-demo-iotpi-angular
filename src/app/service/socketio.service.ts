import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import * as io from "socket.io-client";
import { BehaviorSubject } from "rxjs";
import { Iotpi } from "../model/iotpi";
import { AlertService } from "./alert.service";
import { NavController } from "@ionic/angular";
import { edger } from "@edgeros/web-sdk";

@Injectable({
  providedIn: "root",
})
export class SocketioService {
  // 定义socketio客户端对象
  private socket: SocketIOClient.Socket;

  // 包含用户token和srand数据
  private payload: any = {
    token: "token",
    srand: "srand",
  };

  // http头
  private headers = new HttpHeaders({});

  // 设备列表，可观察对象
  iotpiMapChange = new BehaviorSubject<Map<string, Iotpi>>(
    new Map<string, Iotpi>()
  );
  // 设备灯的状态，可观察对象
  lightsChange = new BehaviorSubject<object>({
    led1: false,
    led2: false,
    led3: false,
  });
  // 设备列表
  iotpiMap = new Map<string, Iotpi>();
  //当前设备
  thisIotpi: Iotpi;
  // 设备灯的状态
  leds = {
    led1: false,
    led2: false,
    led3: false,
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertService: AlertService,
    private nav: NavController
  ) {
    edger.onAction("token", (data: any) => {
      if (!data) {
        edger.notify.error("请先登录！");
      }
      this.payload = data;
    });

    edger.token().then((data: any) => {
      console.log(data);
      if (!data) {
        edger.notify.error("请先登录！");
      }
      this.payload = data;
      this.socket = io({
        path: "/iotpi",
        query: {
          "edger-token": this.payload.token,
          "edger-srand": this.payload.srand,
        },
      });
      this.initSocket();
    });
  }
  // 返回一个socketio连接
  getSocket() {
    return this.socket;
  }

  // 初始化监听事件
  initSocket() {
    this.socket.on("reconnect_attempt", (attempt) => {
      this.socket.io.opts.query = {
        "edger-token": this.payload.token,
        "edger-srand": this.payload.srand,
      };
    });
    this.socket.on("connect_error", (error) => {
      console.error("连接错误，错误：" + error);
    });
    this.socket.on("connect_timeout", (timeout) => {
      console.error("连接超时,用时：" + timeout);
    });
    this.socket.on("error", (error) => {
      console.error("发生错误，错误：" + error);
    });
    this.socket.on("connect", () => {
      console.log("已连接...........");
      this.getIotpiList();
    });
    this.socket.on("disconnect", () => { });
    // 监听后台下线设备事件
    this.socket.on("iotpi-lost", (devid) => {
      edger.notify.info(
        `${this.iotpiMap.get(devid).alias} 设备已下线！`
      );
      this.iotpiMap.delete(devid);
      this.iotpiMapChange.next(this.iotpiMap);
      if (
        this.thisIotpi.devid === devid &&
        this.router.url.includes("detail")
      ) {
        this.nav.back();
      }
    });
    // 监听新加入设备事件
    this.socket.on("iotpi-join", (devobj: Iotpi) => {
      if (!this.iotpiMap.has(devobj.devid)) {
        this.iotpiMap.set(devobj.devid, devobj);
        this.iotpiMapChange.next(this.iotpiMap);
        edger.notify.info(`新上线了 ${devobj.alias} 设备！`);
      }
    });

    this.socket.on("iotpi-error", (error) => {
      this.lightsChange.next(this.leds);
      if (error.code === 50002) {
        edger.notify.error(`无效设备！`);
      } else {
        edger.notify.error(error.message);
      }
    });
    this.socket.on("iotpi-message", (msg) => {
      if (typeof msg.led1 !== "undefined") {
        this.leds.led1 = msg.led1;
      }
      if (typeof msg.led2 !== "undefined") {
        this.leds.led2 = msg.led2;
      }
      if (typeof msg.led3 !== "undefined") {
        this.leds.led3 = msg.led3;
      }
      this.lightsChange.next(this.leds);
    });
  }

  /**
   * 获取设备列表
   */
  getIotpiList() {
    this.socket.emit("iotpi-list", (data: Iotpi[]) => {
      this.iotpiMap.clear();
      if (data.length === 0) {
        edger.notify.info(`暂无设备！`);
      } else {
        data.forEach((value) => {
          if (!this.iotpiMap.has(value.devid)) {
            this.iotpiMap.set(value.devid, value);
          }
        });
      }
      this.iotpiMapChange.next(this.iotpiMap);
    });
  }

  /**
   * 打开设备并进入设备详情页
   * @param iotpi
   */
  getIotpiDetail(iotpi: Iotpi) {
    this.http
      .post("/api/select/" + iotpi.devid, null, {
        headers: this.getHttpHeaders(),
      })
      .subscribe(
        (res: any) => {
          if (res.result) {
            this.thisIotpi = iotpi;
            this.router.navigate(["/detail", iotpi]);
          } else {
            if (res.code === 50004) {
              edger.notify.error('设备错误！');
            } else {
              edger.notify.error('未知错误！');
            }
          }
        },
        (error) => {
          console.log(error);
        }
      );
  }

  /**
   * 获取设备列表可观察对象
   */
  getIotpiMapChange() {
    return this.iotpiMapChange;
  }

  /**
   * 返回灯状态观察者对象
   */
  getLightsChange() {
    return this.lightsChange;
  }

  /**
   * 设备下线提示
   * @param msg
   * @param iotpi
   */
  async presentAlertConfirm(msg: string, iotpi: Iotpi) {
    this.alertService.presentAlertConfirm(msg, () => {
      this.getIotpiDetail(iotpi);
    });
  }

  getHttpHeaders() {
    this.headers = this.headers.set("edger-token", this.payload.token);
    this.headers = this.headers.set("edger-srand", this.payload.srand);
    return this.headers;
  }
}
