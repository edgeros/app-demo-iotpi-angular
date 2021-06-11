import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private alertController: AlertController) { }

  /**
   * 
   * @param msg 设备提示警告框
   * @param callback 
   */
  async presentAlertConfirm(msg: string, callback: () => void) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: '设备提示',
      message: `<strong> ${msg} </strong>`,
      mode: 'ios',
      buttons: [
        {
          text: '取消',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: '确定',
          handler: () => {
            callback();
          }
        }
      ]
    });

    await alert.present();
  }
}
