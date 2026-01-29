"use server";

import { createClient } from "./server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";3
import { supabaseAdmin } from '@/lib/supabase/admin';
import LoginPage from '../../app/(auth)/login/page';
/**
 * Server Actions for authentication
 * Call these from Client Components or forms
 */

export async function setupAdminUser(formData: FormData) {

 const { data: existingUsers} = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1});

 if (existingUsers && existingUsers.users.length > 0){ 
  return { error: "Setup has already been completed"};
 }

 const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: formData.get("email") as string,
  password: formData.get("password") as string,
  email_confirm: true ,
  });

  return { success: true } ;

}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
