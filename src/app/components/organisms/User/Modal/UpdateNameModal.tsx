"use client";

import { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Avatar,
  addToast,
  closeToast,
} from "@heroui/react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { LuCamera } from "react-icons/lu";

import { UserUpdateRequestType } from "@app/types/user";
import { useUserAvatar } from "@app/contexts/UserAvatarContext";

type Props = {
  userId: string;
  currentName: string;
  imageUrl: string;
  isOpen: boolean;
  onOpenChange: () => void;
  onUpdated: Dispatch<SetStateAction<{ name: string; imageUrl: string }>>;
};

type ModalState = "edit" | "cropping";

async function getCroppedBlob(imageSrc: string, cropPixels: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas context unavailable"));
        return;
      }
      ctx.drawImage(
        image,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        400,
        400,
      );
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob failed"));
      }, "image/png");
    };
    image.onerror = reject;
    image.src = imageSrc;
  });
}

export default function UpdateNameModal({
  userId,
  currentName,
  imageUrl,
  isOpen,
  onOpenChange,
  onUpdated,
}: Props) {
  const { setAvatarUrl } = useUserAvatar();
  const [modalState, setModalState] = useState<ModalState>("edit");
  const [name, setName] = useState(currentName);
  const [isDisabled, setIsDisabled] = useState(false);

  // 画像クロップ用
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [srcImage, setSrcImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setModalState("edit");
      setSrcImage(null);
      setPreviewImage(null);
      setCroppedBlob(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setIsDisabled(false);
    }
  }, [isOpen, currentName]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSrcImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setModalState("cropping");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!srcImage || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedBlob(srcImage, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(blob);
      setCroppedBlob(blob);
      setPreviewImage(previewUrl);
      setModalState("edit");
    } catch {
      addToast({ title: "切り取りに失敗しました", color: "danger", timeout: 3000 });
    }
  };

  const handleUpdate = async (onClose: () => void) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsDisabled(true);

    const toastId = addToast({
      title: "プロフィールを更新中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    try {
      let newImageUrl = imageUrl;

      if (croppedBlob) {
        const formData = new FormData();
        formData.append("image", croppedBlob, `${userId}.png`);

        const uploadRes = await fetch(`/api/users/${userId}/images`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(`画像アップロード失敗: ${uploadRes.status}`);
        }

        const { url } = await uploadRes.json();
        newImageUrl = url;
      }

      const body: UserUpdateRequestType = { name: trimmedName, image_url: newImageUrl };

      const updateRes = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!updateRes.ok) {
        throw new Error(`プロフィール更新失敗: ${updateRes.status}`);
      }

      if (toastId) closeToast(toastId);

      addToast({
        title: "プロフィールを更新しました",
        color: "success",
        timeout: 3000,
      });

      onUpdated({ name: trimmedName, imageUrl: newImageUrl });
      if (newImageUrl !== imageUrl) setAvatarUrl(newImageUrl);
      onClose();
    } catch (error) {
      if (toastId) closeToast(toastId);
      addToast({
        title: "更新に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
        color: "danger",
        timeout: 5000,
      });
    } finally {
      setIsDisabled(false);
    }
  };

  const isUnchanged =
    name.trim() === currentName && !croppedBlob;

  return (
    <Modal
      size="sm"
      placement="center"
      isOpen={isOpen}
      isDismissable={false}
      // 処理中(isDisabled)はESC・閉じるボタン・onOpenChange経由のクローズを無効化する
      isKeyboardDismissDisabled={isDisabled}
      hideCloseButton={isDisabled}
      onOpenChange={() => {
        if (isDisabled) return;
        onOpenChange();
      }}
      onClose={() => setIsDisabled(false)}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 px-3">
              プロフィールを変更
            </ModalHeader>

            {modalState === "edit" ? (
              <>
                <ModalBody className="px-3 py-1 flex flex-col items-center gap-4">
                  {/* アバター編集 */}
                  <div className="relative w-20 h-20">
                    <Avatar
                      src={previewImage ?? imageUrl}
                      className="w-20 h-20 text-large"
                      isBordered
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/60 transition-colors"
                      aria-label="アイコン画像を変更"
                    >
                      <LuCamera className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* 名前入力 */}
                  <Input
                    isRequired
                    isDisabled={isDisabled}
                    type="text"
                    label="名前"
                    labelPlacement="outside"
                    placeholder={currentName}
                    value={name}
                    onValueChange={setName}
                    className="w-full"
                  />
                </ModalBody>

                <ModalFooter>
                  <Button
                    color="default"
                    variant="solid"
                    isDisabled={isDisabled}
                    onPress={onClose}
                    className="font-bold"
                  >
                    キャンセル
                  </Button>
                  <Button
                    color="primary"
                    variant="solid"
                    isDisabled={isDisabled || !name.trim() || isUnchanged}
                    onPress={() => handleUpdate(onClose)}
                    className="font-bold"
                  >
                    更新
                  </Button>
                </ModalFooter>
              </>
            ) : (
              <>
                <ModalBody className="px-0 py-0">
                  {/* クロップ UI */}
                  <div className="relative w-full" style={{ height: 300 }}>
                    {srcImage && (
                      <Cropper
                        image={srcImage}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    )}
                  </div>
                  {/* ズームスライダー */}
                  <div className="px-4 pt-2 pb-1">
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </ModalBody>

                <ModalFooter>
                  <Button
                    color="default"
                    variant="solid"
                    onPress={() => setModalState("edit")}
                    className="font-bold"
                  >
                    キャンセル
                  </Button>
                  <Button
                    color="primary"
                    variant="solid"
                    onPress={handleCropConfirm}
                    className="font-bold"
                  >
                    切り取り
                  </Button>
                </ModalFooter>
              </>
            )}
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
