/** Главная внешнего сайта: информация о клинике. График и перезвон — экран E13. */

import { Card, Typography } from "antd";
import { Link } from "react-router-dom";

export default function SiteHome() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <Typography.Title level={2}>Поликлиника «Пандора»</Typography.Title>
      <Card>
        <Typography.Paragraph>
          Внешний сайт клиники — каркас. Здесь появятся приёмные часы, график
          приёмов по специальностям и форма «перезвоните мне» (экран E13 плана).
        </Typography.Paragraph>
        <Typography.Paragraph>
          <Link to="/board">Табло очереди для холла →</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
