import { Component, OnInit } from '@angular/core';
import { SocketioService } from '../service/socketio.service';
import {ActivatedRoute } from '@angular/router';
import { Iotpi } from '../model/iotpi';
import { edger } from '@edgeros/web-sdk';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
})
export class DetailPage implements OnInit {

  // 当前iotpi设备信息
  iotpi: Iotpi;

  // 当个灯当前开关状态
  leds = {
    led1: false,
    led2: false,
    led3: false
  };

  constructor(private socketioService: SocketioService,
              private activatedRouter: ActivatedRoute
              ) {
    this.socketioService.getLightsChange().subscribe((msg: any) => {
      this.leds.led1 = msg.led1;
      this.leds.led2 = msg.led2;
      this.leds.led3 = msg.led3;
    });
    this.activatedRouter.params.subscribe((iotpi: Iotpi) => {
      this.iotpi = iotpi;
    });
  }


  ngOnInit() {
  }

  /**
   * iotpi 信号灯开关控制
   * @param id 
   */
  iotpiControl(id: number) {
    let msg;
    if (id === 1) {
      msg = {led1: !this.leds.led1};
    } else if (id === 2){
      msg = {led2: !this.leds.led2};
    } else if (id === 3) {
      msg = {led3: !this.leds.led3};
    } else {
      edger.notify.error('控制异常！');
    }
    this.socketioService.getSocket().emit('iotpi-control', msg); 
  }


}
