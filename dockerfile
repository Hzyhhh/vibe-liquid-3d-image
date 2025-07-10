# 第一阶段：构建阶段
FROM --platform=linux/amd64 oven/bun:1.1.13-alpine as builder

WORKDIR /app

# 拷贝依赖文件
COPY package.json ./
COPY bun.lockb ./


# 拷贝全部源码
COPY . .

# 安装依赖
RUN bun install

# 构建 H5 版本
RUN bun run build:h5

# 第二阶段：生产镜像，使用 nginx 作为静态服务器
FROM nginx:latest

# 拷贝构建产物到 nginx 静态目录
COPY --from=builder /app/dist/h5 /usr/share/nginx/html

# 可选：自定义 nginx 配置
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
