import db from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import base64url from "base64url";

export async function POST(request) {
  try {
    // Extract the credentials
    const defaultPassword = "jobsnvg123";
    const {
      name,
      email,
      role,
      contactNumber,
      gender,
      emergencyContactNumber,
      permanentAddress,
      currentAddress,
      aadharNumber,
      ctcOffered,
      joiningDate,
      isActive,
    } = await request.json();

    // Ensure joiningDate is valid ISO-8601 date
    const validJoiningDate = joiningDate
      ? new Date(joiningDate).toISOString()
      : null;

    if (!validJoiningDate) {
      return NextResponse.json(
        {
          data: null,
          message: "Invalid or missing joining date.",
        },
        { status: 400 }
      );
    }

    // Check if the user already exists in the db
    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
    });
    if (existingUser) {
      return NextResponse.json(
        {
          data: null,
          message: `User with this email (${email}) already exists in the Database`,
        },
        { status: 409 }
      );
    }

    // Encrypt the password using bcrypt
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Generate token
    const rawToken = uuidv4();
    const token = base64url.encode(rawToken);

    // Create the new user
    const newUser = await db.user.create({
      data: {
        name,
        email,
        contactNumber,
        password: defaultPassword,
        hashedPassword,
        role,
        verificationToken: token,
      },
    });

    // Check if the user creation was successful
    if (!newUser) {
      return NextResponse.json(
        {
          data: null,
          message: "User creation failed. Profile will not be created.",
        },
        { status: 500 }
      );
    }

    // Create the ConsultantProfile if the role is CONSULTANT
    if (role === "CONSULTANT") {
      const consultantProfile = await db.consultantProfile.create({
        data: {
          gender,
          emergencyContactNumber,
          permanentAddress,
          currentAddress,
          aadharNumber,
          ctcOffered,
          joiningDate: validJoiningDate,
          isActive,
          userId: newUser.id, // Link the ConsultantProfile to the newly created user
        },
      });

      // If the ConsultantProfile creation fails
      if (!consultantProfile) {
        // Optionally, you could rollback the user creation here if needed (manual delete)
        await db.user.delete({
          where: { id: newUser.id },
        });

        return NextResponse.json(
          {
            data: null,
            message:
              "Consultant profile creation failed. User creation rolled back.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          data: { newUser, consultantProfile },
          message: "Consultant and profile created successfully",
        },
        { status: 201 }
      );
    }

    // Return response for other roles
    return NextResponse.json(
      {
        data: newUser,
        message: "User created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error,
        message: "Server Error: Something went wrong",
      },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    // Fetch all consultants from the candidate profile
    console.log("get of consultants");

    const consultants = await db.consultantProfile.findMany({
      include: {
        user: true, // Assuming you have a relation to the user model
      },
    });

    // Map the data to include only the necessary fields
    const formattedConsultants = consultants.map((consultant) => ({
      id: consultant.id,
      // candidateCode: consultant.candidateCode,
      name: consultant.user.name, // Assuming user has a name field
      email: consultant.user.email, // Assuming user has an email field
      contactNumber: consultant.user.contactNumber,
      ctcOffered: consultant.ctcOffered,
      currentAddress: consultant.currentAddress,
      // Include any other fields you need
    }));

    return new Response(JSON.stringify(formattedConsultants), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching Consultants:", error);
    return new Response(
      JSON.stringify({ message: "Failed to fetch consultants", error }),
      { status: 500 }
    );
  }
}
