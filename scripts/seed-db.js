const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedDatabase() {
  console.log("Starting Firestore database seeding...");

  try {
    // 1. Create a dummy Admin user profile
    const adminUid = "admin_test_123";
    console.log(`Creating admin profile for UID: ${adminUid}`);
    
    await db.collection('profiles').doc(adminUid).set({
      name: 'System Admin',
      email: 'admin@codexfitness.local',
      role: 'admin',
      bio: 'System Administrator Account',
      heightCm: 180,
      currentWeightKg: 80,
      targetWeightKg: 78,
      calorieTarget: 2500,
      proteinTarget: 170,
      carbTarget: 250,
      fatTarget: 75,
      waterTargetMl: 3000,
      streak: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 2. Create a dummy Workout for the admin
    console.log("Creating dummy workout...");
    await db.collection('workouts').add({
      userId: adminUid,
      title: 'Initial Setup Workout',
      type: 'Strength',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMin: 60,
      caloriesBurned: 450,
      exercises: [
        {
          name: 'Bench Press',
          sets: [{ weightKg: 80, reps: 10 }, { weightKg: 85, reps: 8 }]
        }
      ],
      notes: 'Database connection verified.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log("✅ Database seeded successfully!");
    console.log("The serviceAccountKey connection is working perfectly.");
    
    console.log("\n💡 TIP: If you want to make an existing user an admin:");
    console.log("1. Get their UID from Firebase Authentication.");
    console.log("2. Run the following code in this script:");
    console.log("   await db.collection('profiles').doc('THEIR_UID').update({ role: 'admin' });\n");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

seedDatabase();
