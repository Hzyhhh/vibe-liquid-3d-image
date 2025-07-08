import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Image, Canvas } from "@tarojs/components";
import {
	Button,
	ConfigProvider,
	TextArea,
	Dialog,
} from "@nutui/nutui-react-taro";
import Taro from "@tarojs/taro";
import enUS from "@nutui/nutui-react-taro/dist/locales/en-US";
import zhCN from "@nutui/nutui-react-taro/dist/locales/zh-CN";
import Cropper from "taro-cropper";
import CropperH5 from "react-easy-crop";

import "./index.scss";

const isH5 = process.env.TARO_ENV === "h5";

function getCroppedImg(imageSrc, crop, pixelCrop) {
	return new Promise((resolve) => {
		const image = new window.Image();
		image.crossOrigin = "anonymous";
		image.src = imageSrc;
		image.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = pixelCrop.width;
			canvas.height = pixelCrop.height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				resolve("");
				return;
			}
			ctx.drawImage(
				image,
				pixelCrop.x,
				pixelCrop.y,
				pixelCrop.width,
				pixelCrop.height,
				0,
				0,
				pixelCrop.width,
				pixelCrop.height,
			);
			canvas.toBlob((blob) => {
				if (blob) {
					const url = URL.createObjectURL(blob);
					resolve(url);
				} else {
					resolve("");
				}
			}, "image/jpeg");
		};
	});
}

// 绘制模糊背景+裁剪图并保存
async function drawAndSaveImage(selectedImage: string, croppedImage: string) {
	// 动态获取屏幕宽高
	const screenWidth = window.innerWidth;
	const screenHeight = window.innerHeight;
	const width = screenWidth;
	const height = screenHeight;
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	// 绘制液态玻璃风格背景
	const bgImg = new window.Image();
	bgImg.crossOrigin = "anonymous";
	bgImg.src = selectedImage;
	await new Promise((resolve) => {
		bgImg.onload = () => resolve(null);
	});
	ctx.filter = "blur(10px) brightness(1.2) saturate(1.8)";
	ctx.drawImage(bgImg, 0, 0, width, height);
	ctx.filter = "none";

	// 叠加半透明白色
	ctx.globalAlpha = 0.25;
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, width, height);
	ctx.globalAlpha = 1;

	// 叠加淡蓝色冷色调
	ctx.globalAlpha = 0.1;
	ctx.fillStyle = "rgba(173,216,230,1)";
	ctx.fillRect(0, 0, width, height);
	ctx.globalAlpha = 1;

	// 叠加裁剪图（3:4比例圆角居中显示）
	const fgImg = new window.Image();
	fgImg.crossOrigin = "anonymous";
	fgImg.src = croppedImage;
	await new Promise((resolve) => {
		fgImg.onload = () => resolve(null);
	});

	// 计算裁剪图宽高和居中位置
	const fgWidth = width * 0.8; // 80% 屏幕宽度
	const fgHeight = (fgWidth * 4) / 3; // 3:4 比例
	const fgX = (width - fgWidth) / 2;
	const fgY = (height - fgHeight) / 2;
	const radius = 40; // 圆角半径

	// 绘制圆角遮罩
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(fgX + radius, fgY);
	ctx.lineTo(fgX + fgWidth - radius, fgY);
	ctx.quadraticCurveTo(fgX + fgWidth, fgY, fgX + fgWidth, fgY + radius);
	ctx.lineTo(fgX + fgWidth, fgY + fgHeight - radius);
	ctx.quadraticCurveTo(
		fgX + fgWidth,
		fgY + fgHeight,
		fgX + fgWidth - radius,
		fgY + fgHeight,
	);
	ctx.lineTo(fgX + radius, fgY + fgHeight);
	ctx.quadraticCurveTo(fgX, fgY + fgHeight, fgX, fgY + fgHeight - radius);
	ctx.lineTo(fgX, fgY + radius);
	ctx.quadraticCurveTo(fgX, fgY, fgX + radius, fgY);
	ctx.closePath();
	ctx.clip();

	ctx.drawImage(fgImg, fgX, fgY, fgWidth, fgHeight);
	ctx.restore();

	// 导出图片并下载
	const dataUrl = canvas.toDataURL("image/jpeg");
	const link = document.createElement("a");
	link.href = dataUrl;
	link.download = "image.jpg";
	link.click();
}

// 生成液态玻璃风格预览图（只处理背景，不叠加裁剪图）
async function generateLiquidGlassPreview(
	selectedImage: string,
): Promise<string> {
	const screenWidth = window.innerWidth;
	const screenHeight = window.innerHeight;
	const width = screenWidth;
	const height = screenHeight;
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return "";

	const bgImg = new window.Image();
	bgImg.crossOrigin = "anonymous";
	bgImg.src = selectedImage;
	await new Promise((resolve) => {
		bgImg.onload = () => resolve(null);
	});
	ctx.filter = "blur(10px) brightness(1.2) saturate(1.8)";
	ctx.drawImage(bgImg, 0, 0, width, height);
	ctx.filter = "none";

	ctx.globalAlpha = 0.25;
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, width, height);
	ctx.globalAlpha = 1;

	ctx.globalAlpha = 0.1;
	ctx.fillStyle = "rgba(173,216,230,1)";
	ctx.fillRect(0, 0, width, height);
	ctx.globalAlpha = 1;

	return canvas.toDataURL("image/jpeg");
}

function Index() {
	const [locale, setLocale] = useState(zhCN);
	const localeKey = locale === zhCN ? "zhCN" : "enUS";
	const [visible, setVisible] = useState(false);
	const [selectedImage, setSelectedImage] = useState("");
	const [croppedImage, setCroppedImage] = useState("");
	const [showCropper, setShowCropper] = useState(false);
	const [cropperSrc, setCropperSrc] = useState("");
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
	const [showCanvas, setShowCanvas] = useState(false);
	const canvasRef = useRef(null);
	const [translated] = useState({
		zhCN: {
			welcome: "欢迎使用 NutUI React 开发 Taro 多端项目。",
			button: "使用英文",
			open: "点击打开",
			selectImage: "选择图片",
		},
		enUS: {
			welcome:
				"Welcome to use NutUI React to develop Taro multi-terminal projects.",
			button: "Use Chinese",
			open: "Click Me",
			selectImage: "Select Image",
		},
	});
	const [liquidGlassPreview, setLiquidGlassPreview] = useState("");

	const handleSwitchLocale = () => {
		setLocale(locale === zhCN ? enUS : zhCN);
	};

	const handleSelectImage = () => {
		Taro.chooseImage({
			count: 1,
			sizeType: ["compressed"],
			sourceType: ["album", "camera"],
			success: async (res) => {
				const tempFilePath = res.tempFilePaths[0];
				setCropperSrc(tempFilePath);
				setShowCropper(true);
				const preview = await generateLiquidGlassPreview(tempFilePath);
				setLiquidGlassPreview(preview);
			},
			fail: (err) => {
				console.error("选择图片失败:", err);
				Taro.showToast({
					title: "选择图片失败",
					icon: "none",
				});
			},
		});
	};

	const onCropComplete = useCallback((croppedArea, croppedPixels) => {
		setCroppedAreaPixels(croppedPixels);
	}, []);

	const handleCropH5 = async () => {
		const croppedUrl = (await getCroppedImg(
			cropperSrc,
			null,
			croppedAreaPixels,
		)) as string;
		setCroppedImage(croppedUrl || "");
		setSelectedImage(croppedUrl || "");
		setShowCropper(false);
		if (croppedUrl) {
			const preview = await generateLiquidGlassPreview(croppedUrl);
			setLiquidGlassPreview(preview);
		}
	};

	const handleCropMini = async (res) => {
		setCroppedImage(res.tempFilePath);
		setSelectedImage(res.tempFilePath);
		setShowCropper(false);
		if (res.tempFilePath) {
			const preview = await generateLiquidGlassPreview(res.tempFilePath);
			setLiquidGlassPreview(preview);
		}
	};

	const handleCancelCrop = () => {
		setShowCropper(false);
		setCropperSrc("");
	};

	// 保存到相册
	const handleSaveToAlbum = async () => {
		if (isH5) {
			if (!selectedImage || !croppedImage) return;
			await drawAndSaveImage(selectedImage, croppedImage);
		} else {
			setShowCanvas(true);
			setTimeout(() => {
				Taro.canvasToTempFilePath({
					canvasId: "save-canvas",
					success: (res) => {
						Taro.saveImageToPhotosAlbum({
							filePath: res.tempFilePath,
							success: () => {
								Taro.showToast({ title: "保存成功", icon: "success" });
							},
							fail: () => {
								Taro.showToast({ title: "保存失败", icon: "none" });
							},
						});
					},
					fail: () => {
						Taro.showToast({ title: "生成图片失败", icon: "none" });
					},
				});
				setShowCanvas(false);
			}, 300);
		}
	};

	// 小程序端canvas绘制
	useEffect(() => {
		if (!showCanvas || isH5 || !croppedImage) return;
		const ctx = Taro.createCanvasContext("save-canvas");
		// 绘制背景
		ctx.setFillStyle("#667eea");
		ctx.fillRect(0, 0, 960, 1280);
		// 绘制图片（3:4区域，居中）
		ctx.drawImage(croppedImage, 0, 0, 960, 1280);
		ctx.draw();
	}, [showCanvas, croppedImage]);

	return (
		<ConfigProvider locale={locale}>
			<View className="image-selector-page">
				{/* 背景液态玻璃风格图片 */}
				{liquidGlassPreview && (
					<View className="background-blur">
						<Image src={liquidGlassPreview} mode="aspectFill" />
					</View>
				)}

				{/* 裁剪弹窗 */}
				{showCropper &&
					(isH5 ? (
						<View className="h5-cropper-modal">
							<CropperH5
								image={cropperSrc}
								crop={crop}
								aspect={3 / 4}
								cropShape="rect"
								showGrid={false}
								onCropChange={setCrop}
								onCropComplete={onCropComplete}
							/>
							<View className="h5-cropper-actions">
								<Button type="primary" onClick={handleCropH5}>
									确定
								</Button>
								<Button onClick={handleCancelCrop}>取消</Button>
							</View>
						</View>
					) : (
						<cropper
							src={cropperSrc}
							width={100}
							height={100}
							onCancel={handleCancelCrop}
							onOk={handleCropMini}
						/>
					))}

				{/* 主要内容区域 */}
				<View className="content-container">
					{!selectedImage ? (
						// 未选择图片时显示选择按钮
						<View className="select-button-container">
							<View className="glass-button" onClick={handleSelectImage}>
								<View className="button-icon">📷</View>
								<View className="button-text">
									{translated[localeKey].selectImage}
								</View>
							</View>
						</View>
					) : (
						// 选择图片后显示裁剪结果
						<View className="image-display-container">
							<Image
								src={croppedImage || selectedImage}
								className="selected-image"
								mode="aspectFill"
							/>
							{/* 小程序端canvas，仅保存时显示 */}
							{!isH5 && showCanvas && (
								<Canvas
									canvasId="save-canvas"
									style={{
										width: "320px",
										height: "426px",
										position: "absolute",
										left: "-9999px",
									}}
									width="960"
									height="1280"
									ref={canvasRef}
								/>
							)}
							<View className="image-actions">
								<Button type="primary" size="small" onClick={handleSelectImage}>
									重新选择
								</Button>
								<Button
									type="default"
									size="small"
									onClick={() => {
										setSelectedImage("");

										setCroppedImage("");
									}}
								>
									清除图片
								</Button>
								<Button type="success" size="small" onClick={handleSaveToAlbum}>
									保存到相册
								</Button>
							</View>
						</View>
					)}
				</View>
			</View>
		</ConfigProvider>
	);
}

export default Index;
