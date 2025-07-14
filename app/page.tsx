"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClimbCalc } from "@/components/climb-calc";
import { CruiseCalc } from "@/components/cruise-calc";
import { PerformanceTable } from "@/components/performance-table";

import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="container mx-auto pt-4">
      <div className="flex flex-col space-y-6 max-w-[800px]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Piper Super</h1>
            <p className="text-sm text-secondary-foreground">
              Warrior III performance calculator
            </p>
          </div>
          <ThemeToggle />
        </div>
        <Tabs defaultValue="climb">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="climb-cruise">Climb/Cruise</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          <TabsContent value="climb-cruise">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Climb (x100 ft)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ClimbCalc />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Cruise (x100 ft)</CardTitle>
                </CardHeader>
                <CardContent>
                  <CruiseCalc />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="general">
            <PerformanceTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
