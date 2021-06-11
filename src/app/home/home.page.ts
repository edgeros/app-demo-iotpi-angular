import { SocketioService } from '../service/socketio.service';
import { Component } from '@angular/core';
import { Iotpi } from '../model/iotpi';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  // iotpi设备列表
  iotpiMap = new Map<string, Iotpi>();

  constructor(private socketioService: SocketioService) {
       this.socketioService.getIotpiMapChange().subscribe((data: Map<string, Iotpi> ) => {
         this.iotpiMap = data;
       });
  }

  /**
   * 打开iotpi设备详情页
   * @param iotpi 
   */
  getDetail(iotpi: Iotpi) {
    this.socketioService.getIotpiDetail(iotpi);
  }

  doRefresh(event) {
    setTimeout(() => {
      this.socketioService.getIotpiList();
      event.target.complete();
    }, 1000);
  }

}
