@echo off
echo ========================================================
echo Git Commit and Push Automation Script
echo Committing as: yatharthsinghgreat@gmail.com
echo Commit Date: June 19, 2026
echo ========================================================

:: Ensure we are in the correct directory
cd /d "%~dp0"

:: Set local Git config email
echo Setting Git user email locally...
git config user.email "yatharthsinghgreat@gmail.com"

:: Add all changes to git stage
echo Staging all changes...
git add -A

:: Set environment variables for the commit date
echo Setting commit date environment variables...
set GIT_AUTHOR_DATE=2026-06-19T12:00:00
set GIT_COMMITTER_DATE=2026-06-19T12:00:00

:: Commit changes
echo Committing changes...
git commit -m "Update and monitoring configurations"

:: Push changes to remote origin main
echo Pushing changes to GitHub...
git push origin main

:: Clear environment variables
set GIT_AUTHOR_DATE=
set GIT_COMMITTER_DATE=

echo ========================================================
echo Git commit and push process completed!
echo ========================================================
pause
