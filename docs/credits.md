# 素材来源与授权

规则：只用 CC0 或其他允许商用的授权（CC-BY 要署名；不用 CC-BY-SA、CC-BY-NC 等）。每加一个文件，在这里记一行：文件、来源、作者、授权、怎么改的。

## 音效（`public/sfx/`）

全部是 CC0（公共领域），可商用，不强制署名；这里照样记下来，方便核对和致谢。
处理方式：用 ffmpeg 截取片段、加淡入淡出、响度归一（loudnorm）、转成单声道 96 kbps MP3。freesound 的文件取自站上的高质量预览（`-hq.mp3`），授权与原文件相同。

| 文件 | 用在哪 | 原素材 | 作者 | 授权 | 截取 |
|---|---|---|---|---|---|
| `boo.mp3` | 观众喝倒彩 | [To_Be_Booed2_ses1.wav](https://freesound.org/people/freesound/sounds/25270/) | freesound | CC0 1.0 | 1.0–2.6 s |
| `laugh1.mp3` `laugh2.mp3` `laugh3.mp3` | 观众被征服 | [Sitcom Laughter 9x, Small Audience](https://freesound.org/people/Kinoton/sounds/383207/) | Kinoton | CC0 1.0 | 7.6–9.9 s、15.15–17.55 s、40.35–42.35 s |
| `applause.mp3` | 热度升到热烈、收工 | [Large crowd applause.wav](https://freesound.org/people/Bansemer/sounds/160493/) | Bansemer | CC0 1.0 | 0.5–3.5 s |
| `cheer.mp3` | 沸腾、全场起立 | [Crowd Cheering](https://freesound.org/people/SoundsExciting/sounds/365132/) | SoundsExciting | CC0 1.0 | 1.0–4.6 s |
| `crickets.mp3` | 冷场、节目停播 | [crickets](https://freesound.org/people/FreethinkerAnon/sounds/129678/) | FreethinkerAnon | CC0 1.0 | 2.0–4.6 s |
| `static.mp3` | 开场换台 | [continuous static.wav](https://freesound.org/people/Jace/sounds/35291/) | Jace | CC0 1.0 | 0.5–0.85 s |
| `deal.mp3` | 发牌 | `card-place-1.ogg`，[Casino Audio](https://kenney.nl/assets/casino-audio) | Kenney | CC0 1.0 | 整段 |
| `chip.mp3` | 加筹码（音高随连击升高） | `chip-lay-1.ogg`，同上 | Kenney | CC0 1.0 | 整段 |
| `cash.mp3` | 拿钱、购买 | `chips-stack-1.ogg`，同上 | Kenney | CC0 1.0 | 整段 |
| `pack.mp3` | 打开卡包 | `cards-pack-open-1.ogg`，同上 | Kenney | CC0 1.0 | 整段 |

找过但没用的：OpenGameArt 上的 Applause（Blender Foundation，CC-BY 3.0）、Free Crowd Cheering Sounds（Gregor Quendel，CC-BY 4.0）可商用但要署名，freesound 有同类 CC0 素材就没用；cricket chirping (loopable)（CC-BY-SA 4.0）不用。

## 字体（npm `@fontsource`）

| 字体 | 作者 | 授权 |
|---|---|---|
| ZCOOL KuaiLe（站酷快乐体） | The ZCOOL KuaiLe Project Authors | SIL Open Font License 1.1 |
| Luckiest Guy | Astigmatic | Apache License 2.0 |

## 美术

目前全部是 CSS 和 Unicode 符号画的，没有外部图片。
