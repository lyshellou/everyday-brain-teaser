# 每日脑筋急转弯

一个由 SQLite + Node.js 驱动的随机脑筋急转弯答题网站，完全基于 Node.js 内置模块构建（无 npm 依赖）。该项目为中文版本，面向中文用户群体。

## 技术栈

- **运行时**：Node.js（版本 ≥22，使用 `node:sqlite` 模块）
- **数据库**：通过 `node:sqlite`（`DatabaseSync` 类）操作 SQLite
- **前端**：原生 HTML、CSS、JavaScript（无框架）
- **依赖项**：无 — 零 npm 包依赖
- **端口**：3000（可通过 `PORT` 环境变量配置）

## 运行方式

```
node server.js
```

然后访问 [http://127.0.0.1:3000](http://127.0.0.1:3000)。

## 项目结构

| 文件 | 作用 |
|---|---|
| `server.js` | HTTP 服务器入口文件。负责路由处理、静态文件服务、JSON 请求体解析，并将数据库操作委托给 `db.js`。 |
| `db.js` | SQLite 数据库层。负责数据库表结构创建、初始数据填充、输入验证，以及脑筋急转弯题目（puzzles）的增删改查（CRUD）。 |
| `index.html` | 答题主页面。每次展示一道随机题目，接收用户答案，展示题目解析。 |
| `script.js` | 答题页面的客户端逻辑。从 `/api/puzzles` 加载题目、打乱题目顺序、验证答案。 |
| `admin.html` | 管理面板。左侧侧边栏列出所有题目，右侧表单用于创建/编辑题目。 |
| `admin.js` | 管理面板的客户端逻辑。负责表单数据填充、通过 POST 请求保存数据、渲染题目列表。 |
| `styles.css` | 两个页面共用的样式表。 |
| `data/puzzles.db` | SQLite 数据库文件，服务器启动时自动创建。 |
| `README.md` | 项目简易说明文档。 |

## API 接口

服务器在 `/api/puzzles` 路径下暴露两个 API 接口：

- **GET** `/api/puzzles` — 返回所有题目的 JSON 数组，按 `id` 排序。
- **POST** `/api/puzzles` — 创建或更新题目（当 `id` 冲突时执行更新）。接收 JSON 格式的请求体，返回保存后的题目数据。

所有其他 GET 请求均映射到 `server.js` 中 `staticFiles` 对象定义的静态文件。

## 数据模型

一道题目包含以下字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | 字符串 | 唯一标识符，例如 `"logic-06"` |
| `type` | 枚举值 | `"number"`（数字题）、`"logic"`（逻辑题）、`"word"`（文字题） |
| `difficulty` | 枚举值 | `"easy"`（简单）、`"medium"`（中等）、`"hard"`（困难） |
| `question` | 字符串 | 题目内容文本 |
| `answer` | 字符串 | 标准答案 |
| `acceptedAnswers` | 字符串数组 | 可接受的备选答案（在 SQLite 中以 JSON 格式存储） |
| `explanation` | 字符串 | 解题解析 |

验证规则（详见 `db.js` 中的 `validatePuzzleInput` 函数）：
- 所有字符串字段为必填项，且会自动去除首尾空格
- `type` 必须是 `number`、`logic`、`word` 中的一个
- `difficulty` 必须是 `easy`、`medium`、`hard` 中的一个
- 若 `acceptedAnswers` 为空，默认值为 `[answer]`（即标准答案）

## 初始数据

数据库首次创建时会填充 16 道初始题目：
- 5 道数字规律题（难度分布：2 道简单、2 道中等、1 道困难）
- 5 道逻辑推理题（难度分布：1 道简单、2 道中等、2 道困难）
- 6 道文字谜语题（难度分布：2 道简单、2 道中等、2 道困难）

## 前端行为

### 答题页面（`index.html` + `script.js`）

- 页面加载时，从 `GET /api/puzzles` 获取所有题目
- 将题目 ID 随机打乱生成答题队列，每次展示一道题目
- 避免连续展示同一道题目
- 答案验证规则：将用户输入转为小写并去除空格，与 `acceptedAnswers` 数组比对
- 每道题目支持三个操作：提交答案、查看解析、跳至下一题
- 若 API 无法访问，展示错误状态

### 管理页面（`admin.html` + `admin.js`）

- 侧边栏列出所有题目，并显示题目类型/难度元信息
- 点击某道题目时，表单自动填充该题数据（设置 `editingPuzzleId` 标识编辑状态）
- “新建题目”按钮重置表单，进入创建模式
- 表单字段：id、类型（下拉框）、难度（下拉框）、题目内容、标准答案、备选答案（每行一个）、解析
- 点击保存时发送 `POST /api/puzzles` 请求，随后刷新本地题目列表

## 架构说明

- **无路由/框架依赖**：`server.js` 直接使用原生 `http` 模块，手动解析 `request.url` 和 `request.method` 实现路由。
- **同步 SQLite 操作**：`db.js` 使用同步的 `DatabaseSync` API。`ensureDatabase()` 函数在服务器启动时执行一次。
- **数据库自动创建**：若 `data/puzzles.db` 文件不存在，`ensureDatabase()` 会创建数据表并填充初始数据。
- **单文件静态服务**：静态文件通过 `server.js` 中硬编码的路径映射提供服务，新增静态文件需手动添加到 `staticFiles` 对象。
- **更新插入（Upsert）语义**：`POST /api/puzzles` 使用 `ON CONFLICT(id) DO UPDATE` 语法，因此同一个接口可处理创建和更新操作。

## 约束

- 禁止批量删除文件或目录。需要删除文件时，只能一次删除一个明确路径的文件。