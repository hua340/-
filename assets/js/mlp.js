/* =========================================================
   作业二 · MLP 训练 XOR
   TensorFlow.js 等价实现 + 纯 JS 复刻 PyTorch autograd
   ========================================================= */

(function () {
  "use strict";

  const TF_SOURCE = `# TensorFlow：GradientTape + Adam
import tensorflow as tf
tf.keras.backend.set_floatx("float64")
# ① 张量：x 有4行样本、每行2个输入 x₁、x₂
x = tf.constant([[0.,0.],[0.,1.],[1.,0.],[1.,1.]])
# target 每行1个正确答案：00→0，01→1，10→1，11→0
target = tf.constant([[0.],[1.],[1.],[0.]])

# ② 模型参数：W、v 是连接权重；b 是偏置
W = tf.Variable([[2.,-2.],[-2.,2.]])  # 2输入→2隐藏
b_hidden = tf.Variable([-1.,-1.])
v = tf.Variable([[3.],[3.]])         # 2隐藏→1输出
b_output = tf.Variable([-2.5])
parameters = [W, b_hidden, v, b_output]

optimizer = tf.keras.optimizers.Adam(learning_rate=0.03)
for epoch in range(1, 301):
  with tf.GradientTape() as tape:
    hidden = tf.sigmoid(tf.matmul(x,W)+b_hidden)  # 2个隐藏值
    logits = tf.matmul(hidden,v)+b_output  # 1个原始输出分数

    # ③ 损失：比较原始分数 logits 与正确答案 target
    loss = tf.reduce_mean(
      tf.nn.sigmoid_cross_entropy_with_logits(
        labels=target, logits=logits))

  # ④ 自动求梯度：每个参数稍变会怎样影响损失？
  gradients = tape.gradient(loss, parameters)

  # ⑤ 更新参数：Adam 按梯度改变 W、b、v
  optimizer.apply_gradients(zip(gradients, parameters))

hidden = tf.sigmoid(tf.matmul(x,W)+b_hidden)
prob = tf.sigmoid(tf.matmul(hidden,v)+b_output)  # 0～1概率
print(tf.cast(prob >= 0.5, tf.int32).numpy().ravel())`;

  const TORCH_SOURCE = `# PyTorch：autograd + Adam
import torch
import torch.nn.functional as F
torch.set_default_dtype(torch.float64)
# ① 张量：x 有4行样本、每行2个输入 x₁、x₂
x = torch.tensor([[0.,0.],[0.,1.],[1.,0.],[1.,1.]])
# target 每行1个正确答案：00→0，01→1，10→1，11→0
target = torch.tensor([[0.],[1.],[1.],[0.]])

# ② 模型参数：Parameter 表示这些数可由训练更新
W = torch.nn.Parameter(torch.tensor([[2.,-2.],[-2.,2.]]))
b_hidden = torch.nn.Parameter(torch.tensor([-1.,-1.]))
v = torch.nn.Parameter(torch.tensor([[3.],[3.]]))
b_output = torch.nn.Parameter(torch.tensor([-2.5]))
parameters = [W, b_hidden, v, b_output]

optimizer = torch.optim.Adam(parameters, lr=0.03)
for epoch in range(1, 301):
  optimizer.zero_grad(set_to_none=True)  # 清旧梯度
  hidden = torch.sigmoid(x @ W + b_hidden)  # 2个隐藏值
  logits = hidden @ v + b_output  # 1个原始输出分数

  # ③ 损失：比较原始分数 logits 与正确答案 target
  loss = F.binary_cross_entropy_with_logits(
    logits, target)

  # ④ 自动求梯度：把各参数的梯度写入 .grad
  loss.backward()

  # ⑤ 更新参数：Adam 读取梯度并改变参数
  optimizer.step()

with torch.no_grad():
  hidden = torch.sigmoid(x @ W + b_hidden)
  prob = torch.sigmoid(hidden @ v + b_output)  # 0～1概率
  print((prob >= 0.5).int().flatten().tolist())`;

  const runState = { tf: false, torch: false };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  /* -------------------------------------------------------
     Syntax highlighting
     ------------------------------------------------------- */

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (character) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[character];
    });

  function highlightPython(source) {
    const pattern =
      /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(import|from|as|def|return|for|in|with|print|range|True|False|None|and|or|not|if|else|elif|class|lambda|is|pass|while|break|continue)\b|\b(tf|torch|F|optimizer|parameters)\b|\b(\d+(?:\.\d+)?)\b/g;

    let html = "";
    let cursor = 0;
    let match;

    while ((match = pattern.exec(source)) !== null) {
      html += escapeHtml(source.slice(cursor, match.index));
      const token = match[0];
      let className = "tok-default";

      if (match[1]) className = "tok-comment";
      else if (match[2]) className = "tok-string";
      else if (match[3]) className = "tok-keyword";
      else if (match[4]) className = "tok-module";
      else if (match[5]) className = "tok-number";

      html += `<span class="${className}">${escapeHtml(token)}</span>`;
      cursor = match.index + token.length;
    }

    html += escapeHtml(source.slice(cursor));
    return html;
  }

  function mountCode() {
    const tfCode = $("#tf-code");
    const torchCode = $("#torch-code");
    if (tfCode) tfCode.innerHTML = highlightPython(TF_SOURCE);
    if (torchCode) torchCode.innerHTML = highlightPython(TORCH_SOURCE);
  }

  /* -------------------------------------------------------
     Terminal helpers
     ------------------------------------------------------- */

  function terminalUi(framework) {
    const button = $(`[data-run="${framework}"]`);
    return {
      button,
      label: button ? $(".run-label", button) : null,
      output: $(`[data-output="${framework}"]`),
      status: $(`[data-status="${framework}"]`),
      progress: $(`[data-progress="${framework}"]`)
    };
  }

  function clearTerminal(ui, firstLine) {
    ui.output.innerHTML = "";
    if (firstLine) {
      const line = document.createElement("span");
      line.className = "terminal-muted";
      line.textContent = firstLine;
      ui.output.appendChild(line);
      ui.output.appendChild(document.createTextNode("\n"));
    }
    ui.progress.style.width = "0%";
  }

  async function typeLine(ui, text, className = "", speed = 7) {
    const line = document.createElement("span");
    if (className) line.className = className;
    ui.output.appendChild(line);

    if (reduceMotion) {
      line.textContent = text;
    } else {
      for (let index = 1; index <= text.length; index += 3) {
        line.textContent = text.slice(0, index);
        ui.output.scrollTop = ui.output.scrollHeight;
        await sleep(speed);
      }
      line.textContent = text;
    }

    const breakNode = document.createTextNode("\n");
    ui.output.appendChild(breakNode);
    ui.output.scrollTop = ui.output.scrollHeight;
  }

  function setProgress(ui, value) {
    ui.progress.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  /* -------------------------------------------------------
     XOR result visualisation
     ------------------------------------------------------- */

  const SAMPLE_ORDER = ["00", "01", "10", "11"];
  const TARGETS = [0, 1, 1, 0];

  function setVizState(framework, state, label) {
    const panel = $(`[data-viz="${framework}"]`);
    if (!panel) return;
    const badge = $(`[data-viz-state="${framework}"]`);
    if (!badge) return;
    badge.classList.remove("is-running", "is-done", "is-error");
    if (state) badge.classList.add(`is-${state}`);
    badge.textContent = label;
  }

  function resetVisualization(framework) {
    const panel = $(`[data-viz="${framework}"]`);
    if (!panel) return;
    panel.classList.remove("is-complete");
    setVizState(framework, "running", "训练中…");

    $$(`[data-viz="${framework}"] .sample-dot`).forEach((dot) => {
      dot.classList.remove("is-zero", "is-one");
      dot.textContent = "?";
      dot.removeAttribute("title");
    });

    const plot = $(`[data-viz="${framework}"] .xor-plot`);
    if (plot) plot.setAttribute("aria-label", `${framework} 的 XOR 分类结果：训练中`);
    const accuracy = $(`[data-viz-acc="${framework}"]`);
    if (accuracy) accuracy.textContent = "— / 4";
  }

  function updateVisualization(framework, predictions, probabilities) {
    const panel = $(`[data-viz="${framework}"]`);
    if (!panel) return;

    predictions.forEach((prediction, index) => {
      const sample = SAMPLE_ORDER[index];
      const dot = $(`[data-viz="${framework}"] [data-sample="${sample}"] .sample-dot`);
      if (!dot) return;
      dot.classList.remove("is-zero", "is-one");
      dot.classList.add(prediction === 0 ? "is-zero" : "is-one");
      dot.textContent = String(prediction);
      dot.title = `预测概率 ${Number(probabilities[index]).toFixed(6)}`;
    });

    const correct = predictions.reduce(
      (total, prediction, index) => total + (prediction === TARGETS[index] ? 1 : 0),
      0
    );
    const accuracy = $(`[data-viz-acc="${framework}"]`);
    if (accuracy) accuracy.textContent = `${correct} / 4`;
    const plot = $(`[data-viz="${framework}"] .xor-plot`);
    if (plot) {
      plot.setAttribute(
        "aria-label",
        `${framework} 的 XOR 分类结果：${SAMPLE_ORDER.map((sample, index) => `${sample} → ${predictions[index]}`).join("，")}`
      );
    }
    panel.classList.add("is-complete");
    setVizState(framework, "done", `${correct} / 4 正确`);
  }

  function setVisualizationError(framework) {
    setVizState(framework, "error", "运行失败");
  }

  function setRunning(framework, running) {
    const ui = terminalUi(framework);
    runState[framework] = running;
    ui.button.disabled = running;
    ui.button.classList.toggle("is-running", running);
    ui.button.setAttribute("aria-busy", String(running));
    if (running) {
      ui.label.textContent = "训练中…";
      ui.status.classList.remove("is-error");
    } else {
      ui.label.textContent = "再次运行";
    }
  }

  function fail(ui, message, framework) {
    ui.status.textContent = "运行失败";
    ui.status.classList.add("is-error");
    if (framework) setVisualizationError(framework);
    return typeLine(ui, `[ERROR] ${message}`, "log-error", 5);
  }

  /* -------------------------------------------------------
     TensorFlow.js version
     ------------------------------------------------------- */

  function ensureTensorFlow(timeout = 15000) {
    if (window.tf) return Promise.resolve(true);
    if (window.__tfjsFailed) return Promise.resolve(false);
    const script = document.getElementById("tfjsScript");
    if (!script) return Promise.resolve(false);

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve(Boolean(window.tf));
      };
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, timeout);
    });
  }

  function bceWithLogits(logits, target) {
    // 等价于 sigmoid_cross_entropy_with_logits 的稳定写法：
    // max(logit, 0) - logit * target + log(1 + exp(-|logit|))
    const stable = tf.add(tf.relu(logits), tf.log1p(tf.exp(tf.neg(tf.abs(logits)))));
    return tf.mean(tf.sub(stable, tf.mul(logits, target)));
  }

  async function runTensorFlow() {
    const ui = terminalUi("tf");
    if (runState.tf) return;

    setRunning("tf", true);
    clearTerminal(ui, "$ python xor_tensorflow.py");
    resetVisualization("tf");
    ui.status.textContent = "加载 TensorFlow.js…";
    setProgress(ui, 2);

    const start = performance.now();
    const disposable = [];
    let optimizer = null;

    try {
      const ready = await ensureTensorFlow();
      if (!ready) {
        setRunning("tf", false);
        await fail(ui, "TensorFlow.js 未能加载，请检查网络后刷新页面。", "tf");
        return;
      }

      await tf.setBackend("cpu");
      await tf.ready();
      setProgress(ui, 6);
      ui.status.textContent = "加载数据与初始参数…";

      const x = tf.tensor2d([[0, 0], [0, 1], [1, 0], [1, 1]]);
      const target = tf.tensor2d([[0], [1], [1], [0]]);
      const W = tf.variable(tf.tensor2d([[2, -2], [-2, 2]]));
      const bHidden = tf.variable(tf.tensor1d([-1, -1]));
      const v = tf.variable(tf.tensor2d([[3], [3]]));
      const bOutput = tf.variable(tf.tensor1d([-2.5]));
      const variables = [W, bHidden, v, bOutput];
      disposable.push(x, target, W, bHidden, v, bOutput);

      // Keras Adam 默认 epsilon 为 1e-7；tfjs 默认 1e-8，这里显式对齐。
      optimizer = tf.train.adam(0.03, 0.9, 0.999, 1e-7);

      await typeLine(ui, "[TFJS] backend = cpu | float32", "log-dim", 4);
      await typeLine(ui, "[MODEL] 2 → 2 → 1 | Adam(lr=0.03) | 300 epochs", "log-epoch", 4);
      await typeLine(ui, "[INIT] W=[[2,-2],[-2,2]]  b=(-1,-1)  v=(3,3)  b_out=-2.5", "log-dim", 4);

      for (let epoch = 1; epoch <= 300; epoch += 1) {
        const loss = optimizer.minimize(() => {
          const hidden = tf.sigmoid(tf.add(tf.matMul(x, W), bHidden));
          const logits = tf.add(tf.matMul(hidden, v), bOutput);
          return bceWithLogits(logits, target);
        }, true, variables);

        const lossValue = loss ? loss.dataSync()[0] : Number.NaN;
        if (loss) loss.dispose();

        if (epoch === 1 || epoch % 25 === 0) {
          await typeLine(
            ui,
            `[EPOCH ${String(epoch).padStart(3, "0")}/300] loss=${Number(lossValue).toFixed(6)}`,
            "log-loss",
            2
          );
          ui.status.textContent = `TensorFlow.js 训练中 · Epoch ${epoch}/300`;
          setProgress(ui, 6 + (epoch / 300) * 88);
        } else if (epoch % 10 === 0) {
          await tf.nextFrame();
        }
      }

      ui.status.textContent = "计算最终预测…";
      const hidden = tf.sigmoid(tf.add(tf.matMul(x, W), bHidden));
      const logits = tf.add(tf.matMul(hidden, v), bOutput);
      const prob = tf.sigmoid(logits);
      const prediction = prob.greaterEqual(0.5).cast("int32");
      const probValues = Array.from(prob.dataSync());
      const predValues = Array.from(prediction.dataSync());
      const elapsed = ((performance.now() - start) / 1000).toFixed(2);

      await typeLine(ui, "[PREDICT] probability = [" + probValues.map((value) => value.toFixed(6)).join(", ") + "]", "log-result", 2);
      await typeLine(ui, "[RESULT] predictions = [" + predValues.join(", ") + "]", "log-result", 2);
      updateVisualization("tf", predValues, probValues);
      await typeLine(ui, `[DONE] 300 epochs · ${elapsed}s`, "log-dim", 3);

      hidden.dispose();
      logits.dispose();
      prob.dispose();
      prediction.dispose();
      setProgress(ui, 100);
      ui.status.textContent = "训练完成 · 可再次运行";
    } catch (error) {
      console.error(error);
      await fail(ui, error && error.message ? error.message : "训练失败", "tf");
    } finally {
      disposable.forEach((tensor) => {
        if (!tensor.isDisposed) tensor.dispose();
      });
      optimizer = null;
      setRunning("tf", false);
    }
  }

  /* -------------------------------------------------------
     PyTorch equivalent in plain JS
     ------------------------------------------------------- */

  const sigmoid = (value) => 1 / (1 + Math.exp(-value));

  function stableBce(logit, target) {
    return Math.max(logit, 0) - logit * target + Math.log1p(Math.exp(-Math.abs(logit)));
  }

  function adamStep(param, grad, firstMoment, secondMoment, step, learningRate) {
    const beta1 = 0.9;
    const beta2 = 0.999;
    const epsilon = 1e-8;
    const m = beta1 * firstMoment + (1 - beta1) * grad;
    const s = beta2 * secondMoment + (1 - beta2) * grad * grad;
    const mHat = m / (1 - Math.pow(beta1, step));
    const vHat = s / (1 - Math.pow(beta2, step));
    return {
      value: param - (learningRate * mHat) / (Math.sqrt(vHat) + epsilon),
      m,
      s
    };
  }

  async function runTorch() {
    const ui = terminalUi("torch");
    if (runState.torch) return;

    setRunning("torch", true);
    clearTerminal(ui, "$ python xor_pytorch.py");
    resetVisualization("torch");
    ui.status.textContent = "初始化 autograd 复刻…";
    setProgress(ui, 3);

    const start = performance.now();

    try {
      const x = [[0, 0], [0, 1], [1, 0], [1, 1]];
      const target = [0, 1, 1, 0];

      // 与 PyTorch 版保持一致的初始参数（float64 / JS Number）。
      let W = [2, -2, -2, 2]; // [w00, w01, w10, w11]
      let bHidden = [-1, -1];
      let v = [3, 3];
      let bOutput = -2.5;

      const m = {
        W: [0, 0, 0, 0],
        bHidden: [0, 0],
        v: [0, 0],
        bOutput: 0
      };
      const s = {
        W: [0, 0, 0, 0],
        bHidden: [0, 0],
        v: [0, 0],
        bOutput: 0
      };

      const lr = 0.03;

      await typeLine(ui, "[TORCH→JS] dtype = float64 | autograd = manual", "log-dim", 4);
      await typeLine(ui, "[MODEL] 2 → 2 → 1 | Adam(lr=0.03) | 300 epochs", "log-epoch", 4);
      await typeLine(ui, "[INIT] W=[[2,-2],[-2,2]]  b=(-1,-1)  v=(3,3)  b_out=-2.5", "log-dim", 4);

      for (let epoch = 1; epoch <= 300; epoch += 1) {
        const hidden = [];
        const logits = [];
        let loss = 0;

        for (let i = 0; i < x.length; i += 1) {
          const h0 = sigmoid(x[i][0] * W[0] + x[i][1] * W[2] + bHidden[0]);
          const h1 = sigmoid(x[i][0] * W[1] + x[i][1] * W[3] + bHidden[1]);
          const logit = h0 * v[0] + h1 * v[1] + bOutput;
          hidden.push([h0, h1]);
          logits.push(logit);
          loss += stableBce(logit, target[i]);
        }
        loss /= x.length;

        // 手写 backward：dL/dlogit = (sigmoid(logit) - target) / N
        const gradW = [0, 0, 0, 0];
        const gradBHidden = [0, 0];
        const gradV = [0, 0];
        let gradBOutput = 0;

        for (let i = 0; i < x.length; i += 1) {
          const dLogit = (sigmoid(logits[i]) - target[i]) / x.length;
          const h0 = hidden[i][0];
          const h1 = hidden[i][1];
          const dPre0 = dLogit * v[0] * h0 * (1 - h0);
          const dPre1 = dLogit * v[1] * h1 * (1 - h1);

          gradW[0] += dPre0 * x[i][0];
          gradW[1] += dPre1 * x[i][0];
          gradW[2] += dPre0 * x[i][1];
          gradW[3] += dPre1 * x[i][1];
          gradBHidden[0] += dPre0;
          gradBHidden[1] += dPre1;
          gradV[0] += dLogit * h0;
          gradV[1] += dLogit * h1;
          gradBOutput += dLogit;
        }

        // Adam step，与 torch.optim.Adam 的更新公式一致。
        for (let i = 0; i < W.length; i += 1) {
          const next = adamStep(W[i], gradW[i], m.W[i], s.W[i], epoch, lr);
          W[i] = next.value;
          m.W[i] = next.m;
          s.W[i] = next.s;
        }
        for (let i = 0; i < bHidden.length; i += 1) {
          const next = adamStep(bHidden[i], gradBHidden[i], m.bHidden[i], s.bHidden[i], epoch, lr);
          bHidden[i] = next.value;
          m.bHidden[i] = next.m;
          s.bHidden[i] = next.s;
        }
        for (let i = 0; i < v.length; i += 1) {
          const next = adamStep(v[i], gradV[i], m.v[i], s.v[i], epoch, lr);
          v[i] = next.value;
          m.v[i] = next.m;
          s.v[i] = next.s;
        }
        {
          const next = adamStep(bOutput, gradBOutput, m.bOutput, s.bOutput, epoch, lr);
          bOutput = next.value;
          m.bOutput = next.m;
          s.bOutput = next.s;
        }

        if (epoch === 1 || epoch % 25 === 0) {
          await typeLine(
            ui,
            `[EPOCH ${String(epoch).padStart(3, "0")}/300] loss=${loss.toFixed(6)}`,
            "log-loss",
            2
          );
          ui.status.textContent = `JS autograd 训练中 · Epoch ${epoch}/300`;
          setProgress(ui, 6 + (epoch / 300) * 88);
        } else if (epoch % 10 === 0) {
          await sleep(0);
        }
      }

      const probabilities = [];
      const predictions = [];

      for (let i = 0; i < x.length; i += 1) {
        const h0 = sigmoid(x[i][0] * W[0] + x[i][1] * W[2] + bHidden[0]);
        const h1 = sigmoid(x[i][0] * W[1] + x[i][1] * W[3] + bHidden[1]);
        const probability = sigmoid(h0 * v[0] + h1 * v[1] + bOutput);
        probabilities.push(probability);
        predictions.push(probability >= 0.5 ? 1 : 0);
      }

      const elapsed = ((performance.now() - start) / 1000).toFixed(2);
      await typeLine(ui, "[PREDICT] probability = [" + probabilities.map((value) => value.toFixed(6)).join(", ") + "]", "log-result", 2);
      await typeLine(ui, "[RESULT] predictions = [" + predictions.join(", ") + "]", "log-result", 2);
      updateVisualization("torch", predictions, probabilities);
      await typeLine(ui, `[DONE] 300 epochs · ${elapsed}s`, "log-dim", 3);

      setProgress(ui, 100);
      ui.status.textContent = "训练完成 · 可再次运行";
    } catch (error) {
      console.error(error);
      await fail(ui, error && error.message ? error.message : "训练失败", "torch");
    } finally {
      setRunning("torch", false);
    }
  }

  /* -------------------------------------------------------
     Boot
     ------------------------------------------------------- */

  mountCode();

  $$("[data-run]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.run === "tf") runTensorFlow();
      else runTorch();
    });
  });
})();
