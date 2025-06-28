import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Card, CardContent} from "@/components/ui/card";
import {ClimbCalc} from "@/components/climb-calc";
import {CruiseCalc} from "@/components/cruise-calc";
import {PerformanceTable} from "@/components/performance-table";

export default function Home() {
  return (
    <div className="container mx-auto">
      <div className="flex flex-col space-y-6 max-w-[800px]">
        <div>
          <h1 className="text-3xl font-bold">Performance</h1>
          <p className="text-sm text-secondary-foreground">Warrior III</p>
        </div>
        <Tabs defaultValue="climb">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="climb">Climb</TabsTrigger>
            <TabsTrigger value="cruise">Cruise</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          <TabsContent value="climb">
            <Card>
              <CardContent className="pt-4">
                <ClimbCalc />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="cruise">
            <Card>
              <CardContent className="pt-4">
                <CruiseCalc />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="general">
            <PerformanceTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
