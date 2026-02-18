"use server";

import { createClient } from "./server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from '@/lib/supabase/admin';
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
  email,
  password: formData.get("password") as string,
  email_confirm: true ,
  user_metadata: { username },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true } ;

}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const username = formData.get("username") as string;
  const email = `${username}@hypothetical-publishing.local`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/books");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
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

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  await supabase.auth.signOut({ scope: 'global' });
  revalidatePath("/", "layout");
  return { success: true };
}
