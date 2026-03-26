# Vercel Deployment Workflow

Vercel makes this workflow incredibly easy because it automatically treats your default branch (in your case, `main`) as the **Production** environment and any other branch (like `master`) as a **Preview** environment. 

Here is the step-by-step guide to achieving the workflow you want:

## Step 1: Create and switch to the `master` branch
First, you need to create the `master` branch from your latest `main` code.

```bash
# Make sure you are on main and up to date
git checkout main
git pull origin main

# Create and switch to the new 'master' branch
git checkout -b master
```
*(If the `master` branch already exists, you can just switch to it using `git checkout master` and pull the latest changes).*

## Step 2: Make your changes and push to `master`
Work on your code as usual. Once you're ready to test your changes, commit and push them to the `master` branch.

```bash
# Add your changes
git add .

# Commit your changes
git commit -m "Added new features for testing"

# Push the changes to the master branch (use -u for the first push)
git push -u origin master
```

## Step 3: Check the Preview Deployment
When you push to the `master` branch, Vercel will automatically detect the new branch and create a **Preview Deployment**.
1. Go to your Vercel Dashboard.
2. Click on your project.
3. You will see a new deployment building for the `master` branch. It will have a specific "Preview URL" (for example, `your-project-git-master-yourusername.vercel.app`).
4. Visit this URL to test your changes. **At this point, your main production site remains completely unaffected.**

## Step 4: Merge `master` into `main` (Production)
If everything is working perfectly on the preview URL, it's time to apply these changes to your live site by merging the `master` branch into the `main` branch.

```bash
# Switch back to the production branch (main)
git checkout main

# Get any latest changes from the remote main branch just in case
git pull origin main

# Merge the test changes from master into main
git merge master

# Push the updated main branch to GitHub
git push origin main
```

## Step 5: Vercel Deploys to Production
As soon as you run `git push origin main`, Vercel will detect the update on the `main` branch and automatically trigger a **Production Deployment**. Your live website will now be updated with the tested changes!

---

### Quick Summary of the Daily Workflow Commands
**1. To test new features:**
```bash
git checkout master
git pull origin master   # Get latest master code
# ...make your code changes...
git add .
git commit -m "update feature X"
git push origin master
```
*-> Test the Vercel Preview URL.*

**2. To deploy to production (when testing is successful):**
```bash
git checkout main
git pull origin main
git merge master
git push origin main
```
*-> Vercel automatically deploys to production.*
