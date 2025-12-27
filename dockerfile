FROM node:18-alpine

WORKDIR /app

# 1. 依赖安装（利用缓存）
COPY package*.json ./
RUN npm install --production

# 2. 复制源码
COPY . .

# 4. 把 /app 所有者改成 1000:1000
RUN chown -R 1000:1000 /app

# 5. 切换用户（容器内进程将以 1000 运行）
USER 1000

# 6. 环境变量 & 端口
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# 7. 启动
CMD ["npm", "start"]