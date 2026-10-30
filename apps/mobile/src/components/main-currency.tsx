import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getSetting, setSetting } from '@/db/settings-repo';
import { currencies } from '@/lib/currencies';

export function MainCurrency() {
  const [main, setMain] = useState('USD');

  useEffect(() => {
    getSetting('main_currency')
      .then((c) => {
        if (c) setMain(c);
      })
      .catch(() => {});
  }, []);

  const choose = (code: string) => {
    setMain(code);
    setSetting('main_currency', code).catch(() => {});
  };

  return (
    <View className="w-full gap-3">
      <Text className="text-lg font-semibold text-zinc-900 dark:text-white">Main currency</Text>
      <View className="flex-row flex-wrap gap-2">
        {currencies.map((c) => (
          <Pressable
            key={c.code}
            onPress={() => choose(c.code)}
            className={`rounded-full px-3 py-1.5 ${
              main === c.code ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'
            }`}
          >
            <Text className={main === c.code ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}>
              {c.code}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">
        New expenses start in this currency. Reports will convert totals to it.
      </Text>
    </View>
  );
}
