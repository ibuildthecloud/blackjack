CREATE TABLE "GameState" (
	"id" varchar PRIMARY KEY NOT NULL,
	"compressedState" "bytea" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
