import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export interface DirectTopUpApprovalEmailProps {
  approvalUrl: string;
  studentName: string;
  studentId: string;
  amount: number;
  reason: string;
  requestedByEmail: string | null;
  expiresAt: string;
}

const BLUE950 = '#172554';
const PRIMARY = '#1d4ed8';
const SLATE50 = '#f8fafc';
const SLATE100 = '#f1f5f9';
const SLATE200 = '#e2e8f0';
const SLATE500 = '#64748b';
const SLATE700 = '#334155';

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DirectTopUpApprovalEmail({
  approvalUrl,
  studentName,
  studentId,
  amount,
  reason,
  requestedByEmail,
  expiresAt,
}: DirectTopUpApprovalEmailProps) {
  return (
    <Html lang="vi">
      <Head />
      <Preview>
        Yêu cầu nạp thẳng {formatVnd(amount)} cho {studentName}
      </Preview>
      <Body
        style={{
          backgroundColor: SLATE100,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: '24px 12px',
        }}
      >
        <Container
          style={{
            maxWidth: '620px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            border: `1px solid ${SLATE200}`,
            borderRadius: '18px',
            padding: '28px',
          }}
        >
          <Text
            style={{
              margin: '0 0 8px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: PRIMARY,
            }}
          >
            Unicorns Edu
          </Text>
          <Heading
            as="h1"
            style={{
              margin: '0 0 12px',
              color: BLUE950,
              fontSize: '24px',
              lineHeight: 1.25,
            }}
          >
            Xác nhận yêu cầu nạp thẳng
          </Heading>
          <Text style={{ margin: '0 0 20px', color: SLATE700, fontSize: '14px' }}>
            Một nhân sự đã tạo yêu cầu nạp thẳng vào ví học sinh. Vui lòng kiểm
            tra thông tin trước khi xác nhận.
          </Text>

          <Section
            style={{
              backgroundColor: SLATE50,
              border: `1px solid ${SLATE200}`,
              borderRadius: '14px',
              padding: '16px',
            }}
          >
            <Text style={{ margin: '0 0 8px', color: SLATE500, fontSize: '12px' }}>
              Học sinh
            </Text>
            <Text style={{ margin: '0 0 14px', color: BLUE950, fontSize: '16px', fontWeight: 700 }}>
              {studentName} ({studentId})
            </Text>

            <Text style={{ margin: '0 0 8px', color: SLATE500, fontSize: '12px' }}>
              Số tiền
            </Text>
            <Text style={{ margin: '0 0 14px', color: PRIMARY, fontSize: '22px', fontWeight: 800 }}>
              {formatVnd(amount)}
            </Text>

            <Text style={{ margin: '0 0 8px', color: SLATE500, fontSize: '12px' }}>
              Lý do
            </Text>
            <Text style={{ margin: '0 0 14px', color: SLATE700, fontSize: '14px', lineHeight: 1.6 }}>
              {reason}
            </Text>

            <Text style={{ margin: '0 0 8px', color: SLATE500, fontSize: '12px' }}>
              Người yêu cầu
            </Text>
            <Text style={{ margin: 0, color: SLATE700, fontSize: '14px' }}>
              {requestedByEmail || 'Không có email'}
            </Text>
          </Section>

          <Section style={{ marginTop: '24px', textAlign: 'center' }}>
            <Button
              href={approvalUrl}
              style={{
                backgroundColor: PRIMARY,
                borderRadius: '10px',
                color: '#ffffff',
                display: 'inline-block',
                fontSize: '14px',
                fontWeight: 700,
                padding: '12px 20px',
                textDecoration: 'none',
              }}
            >
              Mở trang xác nhận
            </Button>
          </Section>

          <Text style={{ margin: '18px 0 0', color: SLATE500, fontSize: '12px', lineHeight: 1.6 }}>
            Link này hết hạn lúc {expiresAt} và chỉ dùng được một lần. Nếu không
            nhận ra yêu cầu này, hãy bỏ qua email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
