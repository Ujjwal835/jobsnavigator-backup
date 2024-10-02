"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import Link from "next/link";
import TextInput from "../FormInputs/TextInput";
import SubmitButton from "../FormInputs/SubmitButton";
import { signIn } from "next-auth/react";
import { getData } from "@/lib/getData";
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const token = searchParams.get("token");
    const id = searchParams.get("id");

    if (token && id) {
      setIsVerifying(true);
      const verifyData = {
        token,
        id,
      };
      async function verify() {
        const data = await getData(`users/${id}`);
        console.log("check2", data);
        if (data) {
          console.log("check3");
          // update the email verified to True
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
            const response = await fetch(`${baseUrl}/api/users/verify`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(verifyData),
            });
            if (response.ok) {
              // console.log(response);
              // setLoading(false);
              setIsVerifying(false);
              toast.success("Account Verified Successfully");
            } else {
              setIsVerifying(false);
              // setLoading(false);
              toast.error("Something Went wrong");
            }
          } catch (error) {
            console.log(error);
          }
        }
      }
      verify();
    }

    // console.log(token);
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState(false);
  const [emailErr, setEmailErr] = useState("");

  async function onSubmit(data) {
    console.log(data);
    try {
      setLoading(true);
      // Step 1: Fetch the user data based on the email entered in the login form
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const userResponse = await fetch(
        `${baseUrl}/api/users?email=${data.email}`
      );
      const user = await userResponse.json();
      if (!user) {
        setLoading(false);
        toast.error("User not found. Please check your credentials.");
        return;
      }

      // Step 2: Check if email is verified
      if (!user.emailVerified) {
        setLoading(false);
        toast.error(
          "Email not verified. Please check your email for verification link."
        );
        return;
      }

      // Step 3: Proceed with login if email is verified
      console.log("Attempting to sign in with credentials:", data);
      const loginData = await signIn("credentials", {
        ...data,
        redirect: false,
      });
      console.log("SignIn response:", loginData);
      if (loginData?.error) {
        setLoading(false);
        toast.error("Sign-in error: Check your credentials");
      } else {
        // Step 4: Check if the user is a candidate and their profile is empty
        console.log(user.role);

        if (user.role === "CANDIDATE") {
          if (
            !user.candidateProfile ||
            Object.keys(user.candidateProfile).length === 0
          ) {
            // Redirect to onboarding if the candidate profile is empty
            toast.success("Redirecting to onboarding...");
            reset();
            router.push(`/onboarding/${user.id}`);
          } else {
            // Redirect to home if the candidate profile is not empty
            toast.success("Login Successful");
            reset();
            router.push("/");
          }
        } else {
          // For non-candidate users, just redirect to the homepage
          toast.success("Login Successful");
          reset();
          router.push("/");
        }

        // Sign-in was successful
        // toast.success("Login Successful");
        // reset();
        // router.push("/");
      }
    } catch (error) {
      setLoading(false);
      console.error("Network Error:", error);
      toast.error("Its seems something is wrong with your Network");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 ">
      {isVerifying && <p>Verifying Please Wait...</p>}
      <TextInput
        label="Email"
        name="email"
        type="email"
        placeholder="email@company"
        register={register}
        errors={errors}
        className="sm:col-span-2 mb-3"
      />
      {emailErr && (
        <small className="text-red-600 -mt-2 mb-2">{emailErr}</small>
      )}
      {/* password */}
      <TextInput
        label="Password"
        name="password"
        type="password"
        placeholder="********"
        register={register}
        errors={errors}
        className="sm:col-span-2 mb-3"
      />
      <SubmitButton
        buttonTitle="Login"
        isLoading={loading}
        loadingButtonTitle="Signing In..."
      />
      <div className="flex gap-4 items-center justify-between">
        <Link
          href="/forgot-password"
          className="shrink-0 font-medium text-blue-600 hover:underline dark:text-blue-500"
        >
          Forgot Password
        </Link>
        <p className="text-sm font-light text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:underline dark:text-blue-500"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </form>
  );
}
