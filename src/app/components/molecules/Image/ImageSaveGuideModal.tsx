import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  // 保存対象の画像(複数対応)。長押しで1枚ずつ保存してもらう。
  imageDataUrls: string[];
};

// iOSではWeb Share API経由の共有シートに「画像を保存」が出ないことがあり、
// <a download> もPWA(standalone表示)では無視されるため、
// WebKit標準の「画像を長押し→写真に追加」機能に頼るのが最も確実な保存手段になる。
// 生成した画像を実際に<img>として表示し、長押しで保存してもらうための案内モーダル。
export default function ImageSaveGuideModal({
  isOpen,
  onOpenChange,
  imageDataUrls,
}: Props) {
  const multiple = imageDataUrls.length > 1;

  return (
    <Modal isOpen={isOpen} size="sm" placement="center" onOpenChange={onOpenChange}>
      <ModalContent>
        <>
          <ModalHeader className="px-3 flex items-center gap-2">画像を保存</ModalHeader>
          <ModalBody className="px-3 pb-5 gap-3">
            <p className="text-sm text-default-500">
              {multiple
                ? "各画像を長押しして「”写真”に保存」を選択すると、1枚ずつ保存できます"
                : "画像を長押しして「”写真”に保存」を選択すると保存できます"}
            </p>
            {imageDataUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={multiple ? `保存する画像 ${i + 1}` : "保存する画像"}
                className="w-full rounded-lg border border-default-200"
              />
            ))}
          </ModalBody>
        </>
      </ModalContent>
    </Modal>
  );
}
