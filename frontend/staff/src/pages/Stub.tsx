/** Заглушка экрана из плана: место, роут и название зафиксированы, данные придут из API. */

import { Card, Typography } from "antd";

export default function Stub({ title, plan }: { title: string; plan: string }) {
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {title}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Экран в разработке ({plan}). Здесь будут живые данные из API поликлиники.
      </Typography.Paragraph>
    </Card>
  );
}
