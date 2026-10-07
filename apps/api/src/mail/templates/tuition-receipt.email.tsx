import {
  Body,
  Head,
  Heading,
  Html,
  Img,
  Section,
  Text,
} from '@react-email/components';
import type { TuitionReceiptEmailProps } from '../receipt.types';
import {
  EmailAmountHighlight,
  EmailLayout,
  EmailMutedNote,
  EmailParagraph,
  EMAIL_COLORS,
  EMAIL_FONT_FAMILY,
  EMAIL_MONO_FONT_FAMILY,
  formatVnd,
} from './components/email-layout';

const INK = '#1e3a8a';
const BLUE100 = '#dbeafe';
const BLUE50 = '#eff6ff';

export function TuitionReceiptEmail(props: TuitionReceiptEmailProps) {
  if (props.variant === 'pdf') {
    return (
      <Html lang="vi">
        <Head />
        <Body
          style={{
            backgroundColor: '#ffffff',
            fontFamily: EMAIL_FONT_FAMILY,
            margin: 0,
            padding: 0,
          }}
        >
          <ReceiptDocument {...props} />
        </Body>
      </Html>
    );
  }

  const {
    documentTitle,
    invoiceCode,
    issueDate,
    studentName,
    totalAmount,
    parentName,
    hasPdfAttachment,
    siteUrl,
    brandLogoSrc,
  } = props;
  const greetingName = parentName?.trim() || 'Quý phụ huynh';

  return (
    <EmailLayout
      preview={`${documentTitle} — ${invoiceCode} — ${studentName} — ${formatVnd(totalAmount)}`}
      tone="success"
      icon="🧾"
      eyebrow="Nạp ví thành công"
      title="Unicorns Edu đã nhận học phí"
      logoSrc={brandLogoSrc ?? null}
      siteUrl={siteUrl ?? null}
    >
      <EmailParagraph>Kính gửi {greetingName},</EmailParagraph>
      <EmailParagraph>
        Trung tâm xác nhận đã nhận khoản nạp ví cho học viên{' '}
        <strong style={{ color: EMAIL_COLORS.text }}>{studentName}</strong>.
        Biên lai điện tử của giao dịch nằm ngay bên dưới.
      </EmailParagraph>

      <EmailAmountHighlight
        tone="success"
        label="Số tiền đã nhận"
        amount={totalAmount}
        caption={`Mã biên lai ${invoiceCode} · ${issueDate}`}
      />

      <ReceiptDocument {...props} />

      <EmailMutedNote>
        {hasPdfAttachment
          ? '📎 Bản PDF biên lai được đính kèm trong email này để Quý phụ huynh lưu trữ. '
          : null}
        Nếu Quý phụ huynh không thực hiện giao dịch này, vui lòng liên hệ trung
        tâm ngay.
      </EmailMutedNote>
    </EmailLayout>
  );
}

/** Khối biên lai: dùng chung cho thân email và file PDF. */
function ReceiptDocument({
  documentTitle,
  invoiceCode,
  issueDate,
  studentName,
  studentCode,
  receiverName,
  receiverBankName,
  receiverBankAccount,
  receiptSummary,
  lineItems,
  totalAmount,
  logoMainSrc,
  logoTinSrc,
  stampSrc,
  variant,
}: TuitionReceiptEmailProps) {
  const isPdf = variant === 'pdf';

  return (
    <Section
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${isPdf ? '#1e40af' : EMAIL_COLORS.border}`,
        borderRadius: '14px',
        padding: '18px 18px 16px',
      }}
    >
      {logoMainSrc || logoTinSrc ? (
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          align="center"
          style={{ margin: '0 auto', borderCollapse: 'collapse' }}
        >
          <tbody>
            <tr>
              {logoMainSrc ? (
                <td style={{ padding: '0 10px', verticalAlign: 'middle' }}>
                  <Img
                    src={logoMainSrc}
                    alt="Unicorns Edu"
                    height={isPdf ? 56 : 44}
                    style={{ display: 'block' }}
                  />
                </td>
              ) : null}
              {logoTinSrc ? (
                <td style={{ padding: '0 10px', verticalAlign: 'middle' }}>
                  <Img
                    src={logoTinSrc}
                    alt="Học Tin cùng Chuyên tin"
                    height={isPdf ? 52 : 42}
                    style={{ display: 'block', borderRadius: '6px' }}
                  />
                </td>
              ) : null}
            </tr>
          </tbody>
        </table>
      ) : null}

      <Heading
        as="h2"
        style={{
          margin: '12px 0 2px',
          color: INK,
          fontSize: '15px',
          fontWeight: 800,
          letterSpacing: '0.06em',
          lineHeight: 1.3,
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        {documentTitle}
      </Heading>
      <Text
        style={{
          margin: '0 0 14px',
          color: EMAIL_COLORS.textMuted,
          fontSize: '12px',
          lineHeight: 1.5,
          textAlign: 'center',
        }}
      >
        Unicorns Edu — Học Tin cùng Chuyên tin
      </Text>

      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        width="100%"
        style={{
          width: '100%',
          borderCollapse: 'separate',
          backgroundColor: BLUE50,
          border: `1px solid ${BLUE100}`,
          borderRadius: '10px',
        }}
      >
        <tbody>
          <tr>
            <MetaCell label="Mã biên lai" value={invoiceCode} mono />
            <MetaCell label="Ngày lập" value={issueDate} />
          </tr>
          <tr>
            <MetaCell label="Học viên" value={studentName} />
            <MetaCell label="Mã học viên" value={studentCode?.trim() || '—'} />
          </tr>
        </tbody>
      </table>

      {receiptSummary ? (
        <Text
          style={{
            margin: '12px 0 0',
            color: EMAIL_COLORS.text,
            fontSize: '13px',
            lineHeight: 1.55,
          }}
        >
          <span style={{ color: INK, fontWeight: 700 }}>Nội dung: </span>
          {receiptSummary}
        </Text>
      ) : null}

      <Text
        style={{
          margin: '8px 0 14px',
          color: EMAIL_COLORS.text,
          fontSize: '13px',
          lineHeight: 1.55,
        }}
      >
        <span style={{ color: INK, fontWeight: 700 }}>Người nhận: </span>
        <strong>{receiverName}</strong>
        {receiverBankName ? (
          <>
            <span style={{ color: EMAIL_COLORS.textFaint }}> · </span>
            {receiverBankName}
          </>
        ) : null}
        {receiverBankAccount ? (
          <>
            <span style={{ color: EMAIL_COLORS.textFaint }}> · </span>
            STK{' '}
            <span
              style={{ fontFamily: EMAIL_MONO_FONT_FAMILY, fontWeight: 700 }}
            >
              {receiverBankAccount}
            </span>
          </>
        ) : null}
      </Text>

      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        width="100%"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
        }}
      >
        <thead>
          <tr>
            {(['Ngày', 'Nội dung', 'Số tiền'] as const).map((h) => (
              <th
                key={h}
                style={{
                  backgroundColor: BLUE100,
                  borderBottom: `1px solid ${BLUE100}`,
                  color: INK,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  padding: '8px',
                  textAlign: h === 'Số tiền' ? 'right' : 'left',
                  textTransform: 'uppercase',
                  width:
                    h === 'Ngày'
                      ? '76px'
                      : h === 'Số tiền'
                        ? '96px'
                        : undefined,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((row, i) => (
            <tr key={i}>
              <td style={cellStyle({ nowrap: true })}>{row.date}</td>
              <td style={cellStyle({})}>
                {row.memo}
                {row.referenceCode?.trim() ? (
                  <span
                    style={{
                      display: 'block',
                      marginTop: '2px',
                      color: EMAIL_COLORS.textMuted,
                      fontFamily: EMAIL_MONO_FONT_FAMILY,
                      fontSize: '11px',
                      wordBreak: 'break-all',
                    }}
                  >
                    Mã GD: {row.referenceCode.trim()}
                  </span>
                ) : null}
              </td>
              <td
                style={cellStyle({ nowrap: true, right: true, strong: true })}
              >
                {formatVnd(row.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={2}
              style={{
                backgroundColor: INK,
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                padding: '10px 8px',
              }}
            >
              Tổng cộng
            </td>
            <td
              style={{
                backgroundColor: INK,
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                padding: '10px 8px',
                textAlign: 'right',
                whiteSpace: 'nowrap',
              }}
            >
              {formatVnd(totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>

      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        width="100%"
        style={{ width: '100%', marginTop: '12px', borderCollapse: 'collapse' }}
      >
        <tbody>
          <tr>
            <td valign="bottom" style={{ verticalAlign: 'bottom' }}>
              <Text
                style={{
                  margin: 0,
                  color: EMAIL_COLORS.textMuted,
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                Biên lai điện tử, có giá trị xác nhận đã thu.
                <br />
                Đối chiếu sao kê ngân hàng nếu cần.
              </Text>
            </td>
            <td
              valign="bottom"
              style={{
                textAlign: 'right',
                verticalAlign: 'bottom',
                width: '120px',
              }}
            >
              {stampSrc ? (
                <Img
                  src={stampSrc}
                  alt="Con dấu xác nhận"
                  width={110}
                  style={{ display: 'inline-block' }}
                />
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

function MetaCell({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <td
      valign="top"
      style={{ width: '50%', padding: '10px 12px', verticalAlign: 'top' }}
    >
      <Text
        style={{
          margin: 0,
          color: EMAIL_COLORS.textMuted,
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          lineHeight: '14px',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          margin: '3px 0 0',
          color: EMAIL_COLORS.text,
          fontFamily: mono ? EMAIL_MONO_FONT_FAMILY : undefined,
          fontSize: '14px',
          fontWeight: 700,
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Text>
    </td>
  );
}

function cellStyle(opts: {
  nowrap?: boolean;
  right?: boolean;
  strong?: boolean;
}) {
  return {
    borderBottom: `1px solid ${EMAIL_COLORS.border}`,
    color: EMAIL_COLORS.text,
    fontSize: '12px',
    fontWeight: opts.strong ? 700 : 400,
    lineHeight: 1.5,
    padding: '9px 8px',
    textAlign: opts.right ? ('right' as const) : ('left' as const),
    verticalAlign: 'top' as const,
    whiteSpace: opts.nowrap ? ('nowrap' as const) : undefined,
    wordBreak: 'break-word' as const,
  };
}
