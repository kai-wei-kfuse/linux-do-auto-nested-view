# LINUX DO Auto Nested View

自动将 [linux.do](https://linux.do/) 主题页切换到嵌套视图（树形/nest）的用户脚本。

## 功能

- 访问 `/t/...` 主题页时自动跳转到 `/n/topic/...` 嵌套视图。
- 自动改写页面内主题链接，点击后直接进入嵌套视图。
- 兼容站内单页导航、通知列表链接和动态加载内容。
- 在用户脚本菜单中可一键开启或关闭自动转换。

## 安装

1. 安装 Tampermonkey、Violentmonkey 或其他用户脚本管理器。
    - Tampermonkey:
  
      [<img alt="Available in the Chrome Web Store" src="https://developer.chrome.com/static/docs/webstore/branding/image/iNEddTyWiMfLSwFD6qGq.png" height="48">](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) 
      [<img alt="Get it from Microsoft Edge Add-ons" src="https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/add-ons-badge-images/microsoft-edge-add-ons-badge.png" height="48">](https://microsoftedge.microsoft.com/addons/detail/%E7%AF%A1%E6%94%B9%E7%8C%B4/iikmkjmpaadaobahmlepeloendndfphd)
    - ScriptCat:
  
       [<img alt="Available in the Chrome Web Store" src="https://developer.chrome.com/static/docs/webstore/branding/image/iNEddTyWiMfLSwFD6qGq.png" height="48">](https://chrome.google.com/webstore/detail/scriptcat/ndcooeababalnlpkfedmmbbbgkljhpjf)
      [<img alt="Get it from Microsoft Edge Add-ons" src="https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/add-ons-badge-images/microsoft-edge-add-ons-badge.png" height="48">](https://microsoftedge.microsoft.com/addons/detail/scriptcat/liilgpjgabokdklappibcjfablkpcekh)
2. 点击安装本仓库源码 [LINUX-DO-Auto-Nested-View.user.js](https://github.com/kai-wei-kfuse/linux-do-auto-nested-view/raw/refs/heads/main/LINUX-DO-Auto-Nested-View.user.js)，或直接前往[Greasy Fork](https://greasyfork.org/zh-CN/scripts/580934-linux-do-auto-nested-view%E8%87%AA%E5%8A%A8%E5%B5%8C%E5%A5%97-%E6%A0%91%E5%BD%A2-%E8%A7%86%E5%9B%BE)安装

## Greasy Fork 发布

发布时上传 `LINUX-DO-Auto-Nested-View.user.js`。脚本已包含 Greasy Fork 需要读取的名称、描述、版本、匹配规则和 MIT 许可证元数据。

## 文件

- `LINUX-DO-Auto-Nested-View.user.js`：用户脚本主文件。
