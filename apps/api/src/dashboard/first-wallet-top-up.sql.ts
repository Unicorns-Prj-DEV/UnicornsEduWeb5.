import { Prisma } from '../../generated/client';

/**
 * Lần nạp ví thành công đầu tiên của từng học sinh (định nghĩa **Học sinh mới**
 * trong CONTEXT.md). Chỉ tính giao dịch `topup` gắn với đơn QR SePay đã
 * `completed` hoặc yêu cầu nạp thẳng đã `approved`; hoàn tiền buổi học và cộng
 * tay thủ công (cũng là `topup`) không tính.
 *
 * Trả về cột `student_id`, `first_top_up_at`. Dùng làm subquery:
 * `LEFT JOIN (${FIRST_WALLET_TOP_UP_SQL}) AS first_wallet_top_up ON ...`.
 */
export const FIRST_WALLET_TOP_UP_SQL = Prisma.sql`
  SELECT
    wallet_transactions_history.student_id AS student_id,
    MIN(wallet_transactions_history.created_at) AS first_top_up_at
  FROM wallet_transactions_history
  WHERE wallet_transactions_history.type::text = 'topup'
    AND (
      EXISTS (
        SELECT 1
        FROM student_wallet_sepay_orders
        WHERE student_wallet_sepay_orders.wallet_transaction_id = wallet_transactions_history.id
          AND student_wallet_sepay_orders.status::text = 'completed'
      )
      OR EXISTS (
        SELECT 1
        FROM student_wallet_direct_topup_requests
        WHERE student_wallet_direct_topup_requests.wallet_transaction_id = wallet_transactions_history.id
          AND student_wallet_direct_topup_requests.status::text = 'approved'
      )
    )
  GROUP BY wallet_transactions_history.student_id
`;
