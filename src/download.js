const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const {pipeline} = require('stream');
const {promisify} = require('util');
const url = require("node:url");
const pipe = promisify(pipeline);

const router = express.Router();
router.use(express.json());        // 解析 application/json
router.use(express.urlencoded({extended: true})); // 解析表单
const basePath = process.env.SAVE_PATH || '/data/';

/* ------ 工具：流式下载 ------ */
async function downloadFile(fileUrl, targetAbsolute) {
    const mod = fileUrl.startsWith('https') ? https : http;
    return new Promise((resolve, reject) => {
        mod.get(fileUrl, {timeout: 30_000}, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`远程返回 ${res.statusCode}`));
            }
            // 确保目录存在
            fs.mkdirSync(path.dirname(targetAbsolute), {recursive: true});
            const ws = fs.createWriteStream(targetAbsolute);
            pipe(res, ws)
                .then(() => resolve())
                .catch(reject);
        }).on('error', reject);
    });
}

async function saveToFile(lrc, targetAbsolute) {
    return new Promise((resolve, reject) => {
        // 确保目录存在
        fs.mkdirSync(path.dirname(targetAbsolute), {recursive: true});
        const ws = fs.createWriteStream(targetAbsolute);
        pipe(lrc, ws)
            .then(() => resolve())
            .catch(reject);
    });
}

/* ------ get下载歌曲 ------ */
router.get('/', async (req, res, next) => {
    const {url, name} = req.query;
    if (!url || !name) {
        return res.status(400).json({error: '缺少参数 url 或 name'});
    }

    try {
        let songUrl = decodeURIComponent(url)
        if (songUrl.startsWith('/proxy?target=')) {
            songUrl = songUrl.replace('/proxy?target=', '');
        }
        await downloadFile(songUrl, basePath + name);
        res.json({message: '歌曲下载成功', savedTo: name});
    } catch (err) {
        next(err);   // 统一走 Express 错误中间件
    }
});

/* ------ post保存歌词 ------ */
router.post('/', async (req, res, next) => {
    const {lrc, name} = req.body;
    if (!lrc || !name) {
        return res.status(400).json({error: '缺少参数 lrc 或 name'});
    }

    try {
        await saveToFile(lrc, basePath + name);
        res.json({message: '歌词保存成功', savedTo: name});
    } catch (err) {
        next(err);   // 统一走 Express 错误中间件
    }
});

module.exports = router;