"use client"

import { useQuery } from "@tanstack/react-query"

import { createClient } from "@/shared/supabase/client"

export function useUserSettings() {
  const supabase = createClient()
  return useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .single()
      if (error) throw error
      return data
    },
  })
}
