import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jppuqbujxtmemusmbgnv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcHVxYnVqeHRtZW11c21iZ252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjUyNzEsImV4cCI6MjEwMDIwMTI3MX0.3nOwTHW8xx4DfmFYeqbZ6TE11yrQUeLkREHVGBRd6tk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

