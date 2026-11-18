# 作业站 · 宫钰杰

一个男生向、低饱和冷色、卡皮巴拉气质的卡通作业展示网站。原生 HTML + CSS + JavaScript，无后端、无数据库，可直接部署到 GitHub Pages / Gitee Pages。

## 页面

```text
homework-site/
  index.html                 首页：我的作业展示 + 关于我 + 两个作业入口
  agent-job/
    index.html               作业一：Agent 使用展示
  mlp-job/
    index.html               作业二：用 MLP 训练 XOR（TensorFlow & PyTorch）
  assets/
    css/style.css            全站统一样式
    css/mlp.css              作业二双实验台与分类可视化
    js/site.js               动画、页面跳转、编辑模式、localStorage
    js/mlp.js                TensorFlow.js / JS 版 PyTorch 的 XOR 训练
    vendor/tf.min.js         本地 TensorFlow.js（无需访问 CDN）
  README.md
```

## 本地预览

在 `homework-site` 的上一级目录运行：

```powershell
python -m http.server 4174 --bind 127.0.0.1 --directory homework-site
```

打开：

```text
http://127.0.0.1:4174
```

必须用本地服务器打开。直接双击 `index.html` 也能看页面，但浏览器对 `file://` 下的 localStorage、剪贴板等限制更多。

## 编辑模式

首页右下角有一个半透明的 **「编辑模式」** 按钮。

- 密码：`GYJ2026`
- 密码在 `assets/js/site.js` 顶部：

```js
const EDIT_PASSWORD = "GYJ2026";
```

修改密码后，刷新页面即可生效。

### 可编辑内容

- 首页：姓名（默认 `姓名：宫钰杰`）
- 作业一：两个 Agent 的名称、负责内容、本次成果、完成效率，以及结尾标语
- 作业二：代码、运行逻辑、输出结果不开放编辑

进入编辑模式后，可编辑文字会出现橙色虚线框，直接点击修改。点击底部 **「保存修改」** 写入浏览器 `localStorage`，刷新后仍然保留；点击 **「退出编辑」** 会放弃本次未保存的修改。

> 先回首页进入编辑模式，再点作业卡片进入作业一，Agent 信息会保持可编辑状态。离开当前编辑页时会自动保存当前页的修改。
>
> 这是纯前端密码，只用于防误改，不能作为真正的安全机制。内容只保存在当前浏览器，不会同步给其他访客。
>
> 想让所有访客都看到修改内容，请直接修改对应 HTML 中的默认文字，或清除浏览器 localStorage 后重新部署。

清除本机编辑内容，可在浏览器控制台执行：

```js
localStorage.removeItem("gyj-homework-content-v1");
location.reload();
```

## XOR 页面怎么运行

### TensorFlow 版

- 代码框里保留原版 Python 代码，仅做展示和高亮。
- 点击 **「运行代码」** 后，网页用 **TensorFlow.js** 做等价运算：
  - 2 → 2 → 1 的 MLP
  - Sigmoid + Sigmoid Cross Entropy with Logits
  - Adam，学习率 0.03，300 epochs
  - 每轮重新创建变量，所以可以反复运行
- TensorFlow.js 已放在本地 `assets/vendor/tf.min.js`，不依赖外部 CDN，断网也能运行。

### PyTorch 版

- 代码框保留原版 PyTorch Python 代码。
- 网页端用 **纯 JavaScript 复刻** PyTorch 的计算和 autograd：
  - 与 Python 版相同的初始权重和偏置
  - 手写 sigmoid、BCEWithLogits、反向传播
  - 与 `torch.optim.Adam` 一致的偏差修正更新
  - 300 epochs
- 不依赖 TensorFlow.js，断网也能运行。

### 预期结果

两套实现的最终预测都是：

```text
[0, 1, 1, 0]
```

对应 XOR 真值表：

| x₁ | x₂ | y |
| --- | --- | --- |
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

网页输出会显示每 25 轮的 loss、最终概率和预测结果。由于 TFJS 使用 float32，和 Python float64 的概率值会有非常小的差异，预测结果一致。

### 双实验台与分类结果

作业二采用左右对称的双实验卡布局：

- 左卡 TensorFlow，右卡 PyTorch
- 两张卡都包含原版代码、运行按钮和独立终端
- 两张卡互不影响，可以单独运行、单独重跑
- 页面下方是额外设计的 XOR 分类结果板：TensorFlow 与 PyTorch 各有一块 2×2 样本图

训练完成后，四个样本点会从 `?` 变成实际预测：

- **深绿方块** = 0 类
- **暖橙圆点** = 1 类
- 每块图显示 `4 / 4` 分类正确

这页没有加入密码编辑功能，也没有任何 `contenteditable` 区域；即使首页处于编辑模式，作业二仍保持只读。

## 部署到 GitHub Pages

1. 新建一个 Public 仓库，例如 `homework-site`。
2. 把 **`homework-site` 文件夹里面的内容** 上传到仓库根目录，不要把文件夹本身传进去。
3. 仓库根目录应该直接看到 `index.html`、`agent-job/`、`mlp-job/`、`assets/`。
4. 打开 **Settings → Pages**。
5. Source 选择 **Deploy from a branch**。
6. Branch 选 **main**，文件夹选 **/(root)**，保存。
7. 等 1–2 分钟，访问：

```text
https://你的用户名.github.io/homework-site/
```

## 部署到 Gitee Pages

1. 新建开源仓库，上传 `homework-site` 里面的内容。
2. 进入仓库的 **服务 → Gitee Pages**。
3. 选择分支和部署目录（根目录），启动服务。
4. 按 Gitee 页面提示完成实名认证等必要步骤。

所有资源路径都是相对路径，放在仓库子目录里也能正常工作。

## 修改默认文字

如果想让内容对 **所有访客默认生效**，直接改 HTML：

- 首页姓名：`index.html` 中的 `data-edit-id="home.name"`
- Agent 信息：`agent-job/index.html` 中的 `data-edit-id="agent.*"`
- 标语：`agent-job/index.html` 中的 `data-edit-id="agent.tagline"`

修改后如果本机仍显示旧内容，是因为浏览器 localStorage 里还存着编辑记录；执行上面的清除命令即可。

## 颜色

```text
浅灰米白 #EBE5D6 / #F6F0E1
墨绿     #2F4439 / #1D2B24
藏蓝     #2D4052
深棕     #755A43 / #997856
冷灰     #838C82
鼠尾草绿 #A8B59E
暖橙     #D17F4D / #B76436
```

没有粉色、紫色、爱心、蝴蝶结或花朵元素。

## 说明

- 页面是静态的，不需要安装依赖或构建
- 代码高亮为原生 JavaScript 实现，没有引入高亮库
- TensorFlow.js 已本地化，页面运行不依赖外部服务
- 编辑模式只影响当前浏览器的 localStorage
