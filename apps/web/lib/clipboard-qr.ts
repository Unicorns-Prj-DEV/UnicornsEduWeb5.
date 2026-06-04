import { toast } from "sonner";

export type CopyQrResult = "image" | "link";

export interface QrStudentInfo {
  id: string;
  fullName?: string | null;
  studentClasses?: Array<{
    class?: {
      id?: string;
      name?: string;
    } | null;
    status?: string | null;
  }> | null;
}

export async function copyStudentWalletQrWithToast(
  qrCodeUrl: string,
  student?: QrStudentInfo,
): Promise<CopyQrResult> {
  const copied = await copyQrImageOrLink(qrCodeUrl, student);
  toast.success(
    copied === "image"
      ? (student ? "Đã sao chép ảnh QR kèm thông tin học sinh." : "Đã sao chép ảnh QR.")
      : "Không thể copy ảnh QR, đã sao chép link QR.",
  );
  return copied;
}

async function drawStudentInfoOnQr(
  imageBlob: Blob,
  student: QrStudentInfo,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageBlob);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Could not get 2d canvas context");
        }

        const qrWidth = img.width;
        const qrHeight = img.height;

        // Chiều cao phần footer để chèn thông tin học sinh
        const footerHeight = 110;
        canvas.width = qrWidth;
        canvas.height = qrHeight + footerHeight;

        // 1. Vẽ nền trắng toàn bộ canvas
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Vẽ ảnh QR gốc
        ctx.drawImage(img, 0, 0);

        // 3. Vẽ đường kẻ phân cách nhẹ
        ctx.strokeStyle = "#F3F4F6"; // màu gray-100 nhẹ nhàng sang trọng
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, qrHeight);
        ctx.lineTo(qrWidth - 30, qrHeight);
        ctx.stroke();

        // 4. Vẽ thông tin học sinh
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Tên học sinh (In hoa, Đậm, Màu tối)
        let currentY = qrHeight + 20;
        ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
        ctx.fillStyle = "#1F2937"; // gray-800
        const displayFullName = student.fullName?.trim() || "Học sinh";
        ctx.fillText(displayFullName.toUpperCase(), qrWidth / 2, currentY);

        // Mã học sinh
        currentY += 26;
        ctx.font = "500 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
        ctx.fillStyle = "#4B5563"; // gray-600
        ctx.fillText(`Mã học sinh: ${student.id}`, qrWidth / 2, currentY);

        // Lớp học
        currentY += 22;
        const activeClasses = (student.studentClasses ?? [])
          .filter((c) => !c.status || c.status === "active")
          .map((c) => c.class?.name || "")
          .filter(Boolean);
        const classesStr = activeClasses.length > 0 ? activeClasses.join(", ") : "Chưa xếp lớp";

        ctx.font = "normal 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
        ctx.fillStyle = "#9CA3AF"; // gray-400
        ctx.fillText(`Lớp: ${classesStr}`, qrWidth / 2, currentY);

        // 5. Xuất canvas thành PNG blob
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob output is null"));
          }
        }, "image/png");
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}

export async function copyQrImageOrLink(
  qrCodeUrl: string,
  student?: QrStudentInfo,
): Promise<CopyQrResult> {
  const safeQrCodeUrl = qrCodeUrl.trim();
  if (!safeQrCodeUrl) {
    throw new Error("QR URL is empty.");
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === "function" &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      const response = await fetch(safeQrCodeUrl);
      if (!response.ok) {
        throw new Error("Unable to fetch QR image.");
      }

      let imageBlob = await response.blob();

      // Nếu có thông tin học sinh, tiến hành vẽ thêm text vào ảnh
      if (student) {
        try {
          imageBlob = await drawStudentInfoOnQr(imageBlob, student);
        } catch (canvasErr) {
          console.error("Failed to draw student info on QR code image:", canvasErr);
          // Vẫn tiếp tục copy ảnh gốc nếu vẽ canvas thất bại
        }
      }

      const mimeType = imageBlob.type || "image/png";
      const clipboardBlob =
        imageBlob.type === mimeType
          ? imageBlob
          : new Blob([imageBlob], { type: mimeType });

      await navigator.clipboard.write([
        new ClipboardItem({ [mimeType]: clipboardBlob }),
      ]);
      return "image";
    } catch (err) {
      console.error("Failed to copy QR image to clipboard:", err);
      // Fall through to link copy when image clipboard is unavailable or blocked.
    }
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.writeText !== "function"
  ) {
    throw new Error("Clipboard API is unavailable.");
  }

  await navigator.clipboard.writeText(safeQrCodeUrl);
  return "link";
}
