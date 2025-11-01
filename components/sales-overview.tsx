import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const metrics = [
  {
    title: "Total Penjualan",
    value: "$48,500",
    change: "+12.5%",
    positive: true,
  },
  {
    title: "Unit Terjual",
    value: "12,450",
    change: "+8.2%",
    positive: true,
  },
  {
    title: "Nilai Pesanan Rata-rata",
    value: "$389",
    change: "+2.1%",
    positive: true,
  },
  {
    title: "Pertumbuhan Pelanggan",
    value: "328",
    change: "+15.3%",
    positive: true,
  },
]

export function SalesOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((metric) => (
        <Card key={metric.title} className="leading-7 my-0 py-3.5 border-sidebar-primary bg-background">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl mt-0 mb-1 text-left tracking-wide font-bold border-0">
              {metric.value}
            </div>
            <p className={`text-xs font-semibold ${metric.positive ? "text-primary" : "text-destructive"}`}>
              {metric.change} vs minggu lalu
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default SalesOverview
