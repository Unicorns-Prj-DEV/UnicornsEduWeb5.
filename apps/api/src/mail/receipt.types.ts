export interface ReceiptLineItem {
  date: string;
  memo: string;
  referenceCode?: string | null;
  amount: number;
}

/** Props React Email + PDF biên lai. */
export interface TuitionReceiptEmailProps {
  documentTitle: string;
  invoiceCode: string;
  issueDate: string;
  studentName: string;
  studentCode?: string | null;
  payerName: string;
  receiverName: string;
  receiverBankName?: string | null;
  receiverBankAccount?: string | null;
  lineItems: ReceiptLineItem[];
  totalAmount: number;
  /** `data:image/png;base64,...` cho PDF hoặc `cid:...` cho HTML email. */
  logoMainSrc?: string | null;
  logoTinSrc?: string | null;
  stampSrc?: string | null;
}
