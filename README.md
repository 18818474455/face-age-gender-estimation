# Face Age & Gender Estimation / 人脸年龄与性别估计

[![Live Demo](https://img.shields.io/badge/demo-GitHub%20Pages-6366f1)](https://18818474455.github.io/face-age-gender-estimation/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

基于 face-api.js 的移动端网页 Demo：定位一张照片中的人脸，并输出模型估计的年龄和二分类外观标签。网页可直接部署到 GitHub Pages，也可通过 Capacitor 打包为 Android/iOS 应用。

> **重要说明：** 模型只能根据训练数据和照片外观做近似预测，结果不代表个人身份、性别认同或真实年龄。它可能对不同人群产生系统性误差。

## 在线演示

[打开 GitHub Pages Demo](https://18818474455.github.io/face-age-gender-estimation/)

照片由浏览器在本地解码和推理，本项目没有上传接口；首次打开时会从公共 CDN 下载 face-api.js 和模型权重。

## 功能

- SSD MobileNet v1 人脸检测
- 68 点人脸关键点定位
- AgeGenderNet 年龄与二分类外观标签估计
- 多人结果框选、详情卡片和汇总统计
- 相册选择与移动端拍照入口

## 本地运行

需要 Node.js 22+。

```bash
npm ci
npm run build
npm run serve
```

浏览器打开 `http://localhost:8080`。运行 Demo 还需要网络访问，因为模型脚本和权重在运行时从 CDN 获取。

## 打包移动应用

仓库保留了 Capacitor 的 Android/iOS 工程。修改 `docs/` 后同步静态资源：

```bash
npm ci
npm run cap:sync
npm run cap:open:android
# 或 npm run cap:open:ios
```

Android 构建需要 Android Studio、JDK 17 和 Android SDK；iOS 构建需要 macOS 与 Xcode。

## 目录结构

```text
docs/                 # GitHub Pages 和应用共用的静态网页
android/              # Capacitor Android 工程
ios/                  # Capacitor iOS 工程
capacitor.config.json # Capacitor 配置
```

## 适用边界

- 仅用于学习、界面原型和模型行为研究。
- 不要把结果当作事实，不要用于识别、验证或评价个人。
- 不要用于招聘、教育、金融、保险、医疗、执法、边境管理等高风险决策。
- 处理他人照片前应取得授权；不要收集或保存未经同意的人脸结果。
- 页面把估计年龄小于 12 的结果显示为“儿童”，这只是界面规则，不是可靠的未成年人验证手段。

## 相关开源实验

- [Face Blemish Remover](https://github.com/18818474455/face-blemish-remover)
- [Body Slimming Demo](https://github.com/18818474455/body-slimming-demo)
- [Human Skin-tone Pixel Detection](https://github.com/18818474455/human-skin-tone-detection)
- [Liangzai](https://github.com/18818474455/liangzai) — 商业级跨平台影像处理 SDK 项目主页

## 许可证

项目自有源码使用 [MIT License](LICENSE)。face-api.js、模型权重和 Capacitor 适用各自许可证，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
