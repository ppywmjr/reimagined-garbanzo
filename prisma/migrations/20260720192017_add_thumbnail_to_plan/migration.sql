/*
  Warnings:

  - The primary key for the `course_videos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_video_progress` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `videos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `video_id` on the `course_videos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `video_id` on the `user_video_progress` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `videos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "course_videos" DROP CONSTRAINT "course_videos_video_id_fkey";

-- DropForeignKey
ALTER TABLE "user_video_progress" DROP CONSTRAINT "user_video_progress_video_id_fkey";

-- AlterTable
ALTER TABLE "course_videos" DROP CONSTRAINT "course_videos_pkey",
DROP COLUMN "video_id",
ADD COLUMN     "video_id" UUID NOT NULL,
ADD CONSTRAINT "course_videos_pkey" PRIMARY KEY ("course_id", "video_id");

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "thumbnail" TEXT;

-- AlterTable
ALTER TABLE "user_video_progress" DROP CONSTRAINT "user_video_progress_pkey",
DROP COLUMN "video_id",
ADD COLUMN     "video_id" UUID NOT NULL,
ADD CONSTRAINT "user_video_progress_pkey" PRIMARY KEY ("user_id", "video_id");

-- AlterTable
ALTER TABLE "videos" DROP CONSTRAINT "videos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "course_videos" ADD CONSTRAINT "course_videos_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_video_progress" ADD CONSTRAINT "user_video_progress_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
