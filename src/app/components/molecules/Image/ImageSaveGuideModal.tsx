import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  imageDataUrl: string | null;
};

// iOSではWeb Share API経由の共有シートに「画像を保存」が出ないことがあり、
// <a download> もPWA(standalone表示)では無視されるため、
// WebKit標準の「画像を長押し→写真に追加」機能に頼るのが最も確実な保存手段になる。
// 生成した画像を実際に<img>として表示し、長押しで保存してもらうための案内モーダル。
export default function ImageSaveGuideModal({ isOpen, onOpenChange, imageDataUrl }: Props) {
  return (
    <Modal isOpen={isOpen} size="sm" placement="center" onOpenChange={onOpenChange}>
      <ModalContent>
        <>
          <ModalHeader className="px-3 flex items-center gap-2">画像を保存</ModalHeader>
          <ModalBody className="px-3 pb-5 gap-3">
            <p className="text-sm text-default-500">
              画像を長押しして「&quot;写真&quot;に保存」を選択すると保存できます
            </p>
            {imageDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageDataUrl}
                alt="保存する画像"
                className="w-full rounded-lg border border-default-200"
              />
            )}
          </ModalBody>
        </>
      </ModalContent>
    </Modal>
  );
}
