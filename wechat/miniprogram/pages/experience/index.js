const { experienceUrl } = require('../../config');

Page({
  data: { url: experienceUrl, failed: false },
  onLoad() {
    if (!/^https:\/\//.test(experienceUrl)) this.setData({ failed: true });
  },
  onLoadError() { this.setData({ failed: true }); },
  retry() { this.setData({ failed: false }); },
  onShareAppMessage() {
    return {
      title: 'Formody · 拨形见声',
      path: '/pages/experience/index'
    };
  }
});
