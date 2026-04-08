'use client';

/**
 * 基金参数配置表单
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface FundConfig {
  name: string;
  priorityCapitalRate: number;
  juniorCapitalRate: number;
  traderShareRatio: number;
  priorityShareRatio: number;
  juniorShareRatio: number;
}

interface FundConfigFormProps {
  fundId: string;
  initialConfig: FundConfig;
}

export function FundConfigForm({ fundId, initialConfig }: FundConfigFormProps) {
  const [config, setConfig] = useState<FundConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // 验证比例总和
  const validateRatios = () => {
    const capitalTotal = config.priorityCapitalRate + config.juniorCapitalRate;
    const shareTotal = config.traderShareRatio + config.priorityShareRatio + config.juniorShareRatio;

    if (Math.abs(capitalTotal - 1) > 0.0001) {
      toast({
        title: '验证失败',
        description: `优先/劣后本金比例总和必须等于 100%，当前: ${(capitalTotal * 100).toFixed(2)}%`,
        variant: 'destructive',
      });
      return false;
    }

    if (Math.abs(shareTotal - 1) > 0.0001) {
      toast({
        title: '验证失败',
        description: `盈利分配比例总和必须等于 100%，当前: ${(shareTotal * 100).toFixed(2)}%`,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateRatios()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/fund-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundId, ...config }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '保存成功',
          description: '基金参数配置已更新',
        });
      } else {
        toast({
          title: '保存失败',
          description: result.error || '未知错误',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '网络错误',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: keyof FundConfig, value: string) => {
    const numValue = key === 'name' ? value : parseFloat(value) || 0;
    setConfig((prev) => ({ ...prev, [key]: numValue }));
  };

  // 百分比显示
  const toPercent = (value: number) => (value * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* 本金配置 */}
      <Card>
        <CardHeader>
          <CardTitle>本金配置</CardTitle>
          <CardDescription>优先/劣后本金比例配置，比例总和必须等于 100%</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priorityCapitalRate">优先本金比例</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="priorityCapitalRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.priorityCapitalRate}
                  onChange={(e) => updateConfig('priorityCapitalRate', e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                当前: {toPercent(config.priorityCapitalRate)}%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="juniorCapitalRate">劣后本金比例</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="juniorCapitalRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.juniorCapitalRate}
                  onChange={(e) => updateConfig('juniorCapitalRate', e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                当前: {toPercent(config.juniorCapitalRate)}%
              </p>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>本金比例总和:</span>
              <span className={Math.abs(config.priorityCapitalRate + config.juniorCapitalRate - 1) < 0.0001 ? 'text-green-600' : 'text-red-600'}>
                {((config.priorityCapitalRate + config.juniorCapitalRate) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 盈利分配配置 */}
      <Card>
        <CardHeader>
          <CardTitle>盈利分配配置</CardTitle>
          <CardDescription>盈利时各方分配比例，比例总和必须等于 100%</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="traderShareRatio">操盘手分成</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="traderShareRatio"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.traderShareRatio}
                  onChange={(e) => updateConfig('traderShareRatio', e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                当前: {toPercent(config.traderShareRatio)}%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priorityShareRatio">优先方分成</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="priorityShareRatio"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.priorityShareRatio}
                  onChange={(e) => updateConfig('priorityShareRatio', e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                当前: {toPercent(config.priorityShareRatio)}%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="juniorShareRatio">劣后方分成</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="juniorShareRatio"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.juniorShareRatio}
                  onChange={(e) => updateConfig('juniorShareRatio', e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                当前: {toPercent(config.juniorShareRatio)}%
              </p>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>分配比例总和:</span>
              <span className={Math.abs(config.traderShareRatio + config.priorityShareRatio + config.juniorShareRatio - 1) < 0.0001 ? 'text-green-600' : 'text-red-600'}>
                {((config.traderShareRatio + config.priorityShareRatio + config.juniorShareRatio) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => setConfig(initialConfig)}
          disabled={saving}
        >
          重置
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存配置'}
        </Button>
      </div>
    </div>
  );
}
