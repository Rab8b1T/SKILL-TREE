/**
 * AI GRANDMASTER ROADMAP - Sample Data
 * 75 Levels across 5 Zones
 * 
 * This file auto-loads the roadmap data into the Skill Tree dashboard.
 * You can modify this data or create your own JSON structure.
 */

const AI_GRANDMASTER_ROADMAP = {
    "zones": [
        {
            "id": "zone-1",
            "title": "THE FORGE",
            "subtitle": "Math & Data Engineering",
            "description": "Learn the language of data. If you can't manipulate matrices, you can't build AI.",
            "color": "#7c3aed",
            "icon": "⚡",
            "levels": [
                {
                    "id": "level-1-1",
                    "title": "Scalars & Vectors",
                    "short": "Magnitude, Direction, plotting in 2D/3D",
                    "details": "**Linear Algebra Foundation**\n\nUnderstand the building blocks of machine learning mathematics:\n\n- Scalars: Single numbers (e.g., temperature, price)\n- Vectors: Ordered lists of numbers representing points or directions\n- Magnitude: Length/size of a vector\n- Direction: Where a vector points in space\n- 2D/3D Plotting: Visualizing vectors in coordinate systems\n\nPractice plotting vectors in Python using NumPy and Matplotlib.",
                    "xp": 100,
                    "estimated_hours": 3,
                    "prereqs": [],
                    "status": "unlocked"
                },
                {
                    "id": "level-1-2",
                    "title": "Vector Operations",
                    "short": "Addition, Subtraction, Scaling",
                    "details": "**Vector Arithmetic**\n\nMaster the fundamental operations:\n\n- Vector Addition: Combining vectors tip-to-tail\n- Vector Subtraction: Finding difference vectors\n- Scalar Multiplication: Scaling vectors by constants\n- Unit Vectors: Normalizing to length 1\n\nThese operations form the basis of neural network computations.",
                    "xp": 100,
                    "estimated_hours": 2,
                    "prereqs": ["level-1-1"],
                    "status": "locked"
                },
                {
                    "id": "level-1-3",
                    "title": "The Dot Product",
                    "short": "Geometric interpretation: Similarity",
                    "details": "**Understanding Similarity**\n\nThe dot product is crucial for:\n\n- Measuring similarity between vectors\n- Calculating projections\n- Understanding attention mechanisms in transformers\n- Cosine similarity in embeddings\n\nFormula: a·b = |a||b|cos(θ)\n\nWhen vectors are similar (small angle), dot product is large and positive.",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-1-2"],
                    "status": "locked"
                },
                {
                    "id": "level-1-4",
                    "title": "Matrices",
                    "short": "Dimensions, Transpose, Identity Matrix",
                    "details": "**Matrix Fundamentals**\n\nMatrices are 2D arrays of numbers:\n\n- Dimensions: Rows × Columns (m × n)\n- Transpose: Flipping rows and columns (A^T)\n- Identity Matrix: Diagonal 1s, zeros elsewhere\n- Square vs Rectangular matrices\n\nMatrices represent transformations and store weights in neural networks.",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-1-3"],
                    "status": "locked"
                },
                {
                    "id": "level-1-5",
                    "title": "Matrix Multiplication",
                    "short": "The engine of Neural Networks",
                    "details": "**The Core Operation**\n\nMatrix multiplication powers all deep learning:\n\n- Rules: (m×n) × (n×p) = (m×p)\n- Dot products of rows and columns\n- Order matters! AB ≠ BA\n- Batch processing via matrix ops\n\nEvery forward pass in a neural network is matrix multiplication.",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-1-4"],
                    "status": "locked"
                },
                {
                    "id": "level-1-6",
                    "title": "Eigenvalues & Eigenvectors",
                    "short": "Understanding Principal Components",
                    "details": "**Advanced Linear Algebra**\n\nEigenvectors remain in the same direction after transformation:\n\n- Av = λv (A is matrix, v is eigenvector, λ is eigenvalue)\n- Used in PCA for dimensionality reduction\n- Understanding data variance directions\n- Stability analysis in systems\n\nKey for unsupervised learning and data compression.",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-1-5"],
                    "status": "locked"
                },
                {
                    "id": "level-1-7",
                    "title": "Derivatives",
                    "short": "Rate of change, slopes",
                    "details": "**Calculus for Machine Learning**\n\nDerivatives measure instantaneous rate of change:\n\n- Slope of tangent line to a curve\n- f'(x) = lim[h→0] (f(x+h) - f(x))/h\n- Power rule, chain rule, product rule\n- Finding minima and maxima\n\nDerivatives tell us which direction to adjust weights.",
                    "xp": 150,
                    "estimated_hours": 4,
                    "prereqs": ["level-1-6"],
                    "status": "locked"
                },
                {
                    "id": "level-1-8",
                    "title": "Partial Derivatives",
                    "short": "Slopes in multi-dimensional space",
                    "details": "**Multi-Variable Calculus**\n\nWhen functions have multiple variables:\n\n- ∂f/∂x: Derivative with respect to x, holding others constant\n- Each partial derivative is a direction of change\n- Essential for optimizing functions with many parameters\n- Neural networks have millions of parameters!\n\nPartial derivatives show how each weight affects the output.",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-1-7"],
                    "status": "locked"
                },
                {
                    "id": "level-1-9",
                    "title": "The Gradient Vector",
                    "short": "The direction of steepest ascent/descent",
                    "details": "**The Key to Optimization**\n\nThe gradient combines all partial derivatives:\n\n- ∇f = [∂f/∂x₁, ∂f/∂x₂, ..., ∂f/∂xₙ]\n- Points in direction of steepest increase\n- Negative gradient = steepest descent\n- Magnitude indicates steepness\n\nGradient descent follows the negative gradient to minimize loss.",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-1-8"],
                    "status": "locked"
                },
                {
                    "id": "level-1-10",
                    "title": "The Chain Rule",
                    "short": "How changes propagate through a system",
                    "details": "**Backpropagation's Foundation**\n\nThe chain rule for composite functions:\n\n- d/dx[f(g(x))] = f'(g(x)) · g'(x)\n- Allows computing gradients through layers\n- Essential for backpropagation algorithm\n- Handles any depth of composition\n\nWithout the chain rule, deep learning wouldn't exist.",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-1-9"],
                    "status": "locked"
                },
                {
                    "id": "level-1-11",
                    "title": "Central Tendency & Variance",
                    "short": "Mean, Median, Mode & Standard Deviation",
                    "details": "**Descriptive Statistics**\n\nUnderstanding data distributions:\n\n- Mean: Average value (μ = Σx/n)\n- Median: Middle value when sorted\n- Mode: Most frequent value\n- Variance: σ² = Σ(x-μ)²/n\n- Standard Deviation: σ = √variance\n\nThese metrics describe your training data and model outputs.",
                    "xp": 100,
                    "estimated_hours": 2,
                    "prereqs": ["level-1-10"],
                    "status": "locked"
                },
                {
                    "id": "level-1-12",
                    "title": "Probability Distributions",
                    "short": "Normal/Gaussian, Uniform, Bernoulli",
                    "details": "**Statistical Foundations**\n\nKey distributions in ML:\n\n- Normal (Gaussian): Bell curve, most natural phenomena\n- Uniform: Equal probability across range\n- Bernoulli: Binary outcomes (0 or 1)\n- Binomial: Sum of Bernoulli trials\n\nWeight initialization, noise, and many algorithms use these distributions.",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-1-11"],
                    "status": "locked"
                },
                {
                    "id": "level-1-13",
                    "title": "Hypothesis Testing",
                    "short": "P-values, Null Hypothesis",
                    "details": "**Statistical Inference**\n\nMaking decisions from data:\n\n- Null Hypothesis (H₀): Default assumption\n- Alternative Hypothesis (H₁): What you're testing\n- P-value: Probability of results if H₀ is true\n- Significance level (α): Threshold for rejection\n\nUsed for A/B testing and validating model improvements.",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-1-12"],
                    "status": "locked"
                },
                {
                    "id": "level-1-14",
                    "title": "Correlation vs Causation",
                    "short": "Covariance matrices",
                    "details": "**Understanding Relationships**\n\nCorrelation measures linear relationship:\n\n- Correlation coefficient: -1 to +1\n- Covariance: How variables change together\n- Covariance Matrix: All pairwise covariances\n- Correlation ≠ Causation!\n\nCritical for feature selection and understanding model behavior.",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-1-13"],
                    "status": "locked"
                },
                {
                    "id": "level-1-15",
                    "title": "Advanced NumPy",
                    "short": "Broadcasting, Slicing, Reshaping—No loops allowed",
                    "details": "**Efficient Array Operations**\n\nMaster NumPy for fast computations:\n\n- Broadcasting: Operations on different-shaped arrays\n- Slicing: arr[start:stop:step]\n- Reshaping: Changing array dimensions\n- Vectorization: Avoiding Python loops\n\nNumPy operations are 10-100x faster than Python loops.",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-1-14"],
                    "status": "locked"
                },
                {
                    "id": "level-1-16",
                    "title": "Pandas Series & DataFrames",
                    "short": "Indexing, Selection, Filtering",
                    "details": "**Data Manipulation**\n\nPandas for structured data:\n\n- Series: 1D labeled array\n- DataFrame: 2D labeled table\n- .loc[]: Label-based selection\n- .iloc[]: Integer-based selection\n- Boolean indexing: df[df['col'] > 5]\n\nPandas is essential for data preprocessing.",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-1-15"],
                    "status": "locked"
                },
                {
                    "id": "level-1-17",
                    "title": "Pandas Data Cleaning",
                    "short": "Handling NaN, duplicates, string manipulation",
                    "details": "**Data Quality**\n\nClean data is essential:\n\n- .dropna(), .fillna(): Handle missing values\n- .drop_duplicates(): Remove duplicates\n- .str methods: String manipulation\n- .apply(): Custom transformations\n- Type conversion: .astype()\n\n80% of ML work is data cleaning!",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-1-16"],
                    "status": "locked"
                },
                {
                    "id": "level-1-18",
                    "title": "Data Visualization",
                    "short": "Matplotlib/Seaborn: Histograms, Scatter plots, Heatmaps",
                    "details": "**Visual Data Analysis**\n\nVisualize to understand:\n\n- Matplotlib: Low-level plotting\n- Seaborn: Statistical visualizations\n- Histograms: Distribution of values\n- Scatter plots: Relationships between variables\n- Heatmaps: Correlation matrices\n\nAlways visualize before modeling!",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-1-17"],
                    "status": "locked"
                },
                {
                    "id": "level-1-19",
                    "title": "SQL for Data Science",
                    "short": "Complex Joins, Window Functions, CTEs",
                    "details": "**Database Querying**\n\nAdvanced SQL for ML pipelines:\n\n- JOINs: LEFT, RIGHT, INNER, OUTER\n- Window Functions: ROW_NUMBER(), LAG(), LEAD()\n- CTEs: WITH clause for readable queries\n- Aggregations: GROUP BY, HAVING\n\nMost production data lives in databases.",
                    "xp": 200,
                    "estimated_hours": 5,
                    "prereqs": ["level-1-18"],
                    "status": "locked"
                },
                {
                    "id": "level-1-boss",
                    "title": "🎯 BOSS BATTLE: The Data Storyteller",
                    "short": "End-to-end data analysis project",
                    "details": "**Zone 1 Final Challenge**\n\n**Task:** Download the 'Titanic' or 'House Prices' dataset.\n\n1. Write a SQL script to simulate extracting this data\n2. Use Pandas to clean missing values\n3. Use Matplotlib to show which features (Age, Gender, Class) actually matter\n\n**Outcome:** A Jupyter Notebook that tells a story. No prediction yet—just understanding the data!\n\n**Success Criteria:**\n- Clean, documented code\n- At least 5 visualizations\n- Written analysis of findings",
                    "xp": 500,
                    "estimated_hours": 8,
                    "prereqs": ["level-1-19"],
                    "status": "locked"
                }
            ]
        },
        {
            "id": "zone-2",
            "title": "THE PREDICTOR",
            "subtitle": "Classical Machine Learning",
            "description": "Master the algorithms that run the business world.",
            "color": "#06b6d4",
            "icon": "🎯",
            "levels": [
                {
                    "id": "level-2-1",
                    "title": "Linear Regression Theory",
                    "short": "The equation y = mx + c in high dimensions",
                    "details": "**The Foundation of Prediction**\n\nLinear regression extended:\n\n- y = w₁x₁ + w₂x₂ + ... + wₙxₙ + b\n- Matrix form: y = Xw + b\n- Finding the best fit line/hyperplane\n- Assumptions: Linearity, independence, normality\n\nSimple but powerful—many real-world relationships are linear!",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-1-boss"],
                    "status": "locked"
                },
                {
                    "id": "level-2-2",
                    "title": "Cost Functions",
                    "short": "MSE - Mean Squared Error",
                    "details": "**Measuring Prediction Quality**\n\nHow wrong are our predictions?\n\n- MSE = (1/n) Σ(yᵢ - ŷᵢ)²\n- Penalizes large errors heavily\n- Always non-negative\n- Differentiable (important for optimization)\n\nAlso learn MAE, RMSE, and when to use each.",
                    "xp": 100,
                    "estimated_hours": 2,
                    "prereqs": ["level-2-1"],
                    "status": "locked"
                },
                {
                    "id": "level-2-3",
                    "title": "Gradient Descent",
                    "short": "Implementing the optimization loop from scratch",
                    "details": "**The Learning Algorithm**\n\nIteratively minimize the cost:\n\n```\nw = w - α * ∂L/∂w\nb = b - α * ∂L/∂b\n```\n\n- α = learning rate\n- Batch, Stochastic, Mini-batch variants\n- Convergence and learning rate tuning\n\nImplement from scratch in Python—no libraries!",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-2-2"],
                    "status": "locked"
                },
                {
                    "id": "level-2-4",
                    "title": "Polynomial Regression",
                    "short": "Fitting curves, not lines",
                    "details": "**Beyond Linearity**\n\nCapture non-linear patterns:\n\n- Add polynomial features: x², x³, x₁x₂\n- Still linear in parameters!\n- Risk of overfitting with high degrees\n- Feature engineering importance\n\nKnow when linear isn't enough.",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-2-3"],
                    "status": "locked"
                },
                {
                    "id": "level-2-5",
                    "title": "Regularization",
                    "short": "L1 Lasso vs L2 Ridge - preventing overfitting",
                    "details": "**Fighting Overfitting**\n\nAdd penalty to cost function:\n\n- L2 (Ridge): + λΣwᵢ² (shrinks weights)\n- L1 (Lasso): + λΣ|wᵢ| (creates sparsity)\n- Elastic Net: Combination of both\n- λ = regularization strength\n\nRegularization is essential for generalization!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-2-4"],
                    "status": "locked"
                },
                {
                    "id": "level-2-6",
                    "title": "Logistic Regression",
                    "short": "Sigmoid function, decision boundaries",
                    "details": "**Classification, Not Regression**\n\nPredicting probabilities:\n\n- Sigmoid: σ(z) = 1/(1+e^(-z))\n- Output between 0 and 1\n- Binary Cross-Entropy loss\n- Decision boundary at 0.5\n\nThe simplest classifier—and often surprisingly effective!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-2-5"],
                    "status": "locked"
                },
                {
                    "id": "level-2-7",
                    "title": "Classification Metrics",
                    "short": "Confusion Matrix, Precision, Recall, F1, ROC",
                    "details": "**Evaluating Classifiers**\n\nAccuracy isn't everything:\n\n- Confusion Matrix: TP, TN, FP, FN\n- Precision: TP/(TP+FP) - \"Of predicted positive\"\n- Recall: TP/(TP+FN) - \"Of actual positive\"\n- F1 Score: Harmonic mean of P and R\n- ROC Curve & AUC\n\nChoose metrics based on business impact!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-2-6"],
                    "status": "locked"
                },
                {
                    "id": "level-2-8",
                    "title": "Support Vector Machines",
                    "short": "SVM & Kernels",
                    "details": "**Maximum Margin Classifier**\n\nFind the optimal separating hyperplane:\n\n- Support Vectors: Points closest to boundary\n- Maximize margin between classes\n- Kernel Trick: RBF, Polynomial, Linear\n- Soft margin for non-separable data\n\nSVMs were state-of-the-art before deep learning!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-2-7"],
                    "status": "locked"
                },
                {
                    "id": "level-2-9",
                    "title": "K-Nearest Neighbors",
                    "short": "KNN classification and regression",
                    "details": "**Instance-Based Learning**\n\nPredict based on similar examples:\n\n- Find K closest training points\n- Majority vote (classification) or average (regression)\n- Distance metrics: Euclidean, Manhattan\n- Choosing K: Too small = noise, too large = blur\n\nSimple, interpretable, but slow for large datasets.",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-2-8"],
                    "status": "locked"
                },
                {
                    "id": "level-2-10",
                    "title": "Decision Trees",
                    "short": "Entropy, Gini Impurity, Pruning",
                    "details": "**Tree-Based Models**\n\nLearn decision rules from data:\n\n- Split criteria: Information Gain, Gini Impurity\n- Recursive partitioning\n- Overfitting: Deep trees memorize\n- Pruning: Pre-pruning vs post-pruning\n\nHighly interpretable—you can explain every prediction!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-2-9"],
                    "status": "locked"
                },
                {
                    "id": "level-2-11",
                    "title": "Random Forests",
                    "short": "Bagging, Bootstrapping",
                    "details": "**Ensemble of Trees**\n\nCombine many trees for robust predictions:\n\n- Bootstrap Aggregating (Bagging)\n- Random feature subsets\n- Reduces overfitting through averaging\n- Feature importance scores\n\nOften the best out-of-the-box algorithm!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-2-10"],
                    "status": "locked"
                },
                {
                    "id": "level-2-12",
                    "title": "Boosting Theory",
                    "short": "AdaBoost",
                    "details": "**Sequential Learning**\n\nLearn from mistakes:\n\n- Train weak learners sequentially\n- Each learner focuses on previous errors\n- Weighted voting for final prediction\n- AdaBoost: Adaptive Boosting\n\nBoosting often beats bagging!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-2-11"],
                    "status": "locked"
                },
                {
                    "id": "level-2-13",
                    "title": "Gradient Boosting Machines",
                    "short": "XGBoost, LightGBM, CatBoost",
                    "details": "**The Kaggle Champions**\n\nState-of-the-art for tabular data:\n\n- XGBoost: Extreme Gradient Boosting\n- LightGBM: Faster, leaf-wise growth\n- CatBoost: Handles categoricals natively\n- Hyperparameter tuning essentials\n\nWin Kaggle competitions with these!",
                    "xp": 300,
                    "estimated_hours": 6,
                    "prereqs": ["level-2-12"],
                    "status": "locked"
                },
                {
                    "id": "level-2-14",
                    "title": "K-Means Clustering",
                    "short": "Elbow method",
                    "details": "**Unsupervised Clustering**\n\nGroup similar data points:\n\n- Randomly initialize K centroids\n- Assign points to nearest centroid\n- Update centroids as cluster means\n- Repeat until convergence\n- Elbow method for choosing K\n\nDiscover patterns without labels!",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-2-13"],
                    "status": "locked"
                },
                {
                    "id": "level-2-15",
                    "title": "DBSCAN",
                    "short": "Density-based clustering",
                    "details": "**Discovering Arbitrary Shapes**\n\nDensity-based clustering:\n\n- No need to specify K!\n- Finds clusters of arbitrary shape\n- Identifies noise/outliers\n- Parameters: epsilon (radius), minPts\n\nGreat when K-Means fails on non-spherical clusters.",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-2-14"],
                    "status": "locked"
                },
                {
                    "id": "level-2-16",
                    "title": "PCA",
                    "short": "Principal Component Analysis - Dimensionality Reduction",
                    "details": "**Compress Without Losing Information**\n\nReduce dimensions while preserving variance:\n\n- Find eigenvectors of covariance matrix\n- Project onto principal components\n- Explained variance ratio\n- Choosing number of components\n\nVisualize high-dimensional data in 2D/3D!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-2-15"],
                    "status": "locked"
                },
                {
                    "id": "level-2-boss",
                    "title": "🎯 BOSS BATTLE: The Churn Predictor API",
                    "short": "Build and deploy a customer churn model",
                    "details": "**Zone 2 Final Challenge**\n\n**Task:** Take a Telecom Churn dataset.\n\n1. Train an XGBoost model to predict if a customer will leave\n2. Achieve an F1-Score > 0.80\n3. Save the model using joblib\n4. Create a simple Python script where you input user data and it outputs 'Stay' or 'Leave'\n\n**Success Criteria:**\n- F1-Score > 0.80\n- Clean preprocessing pipeline\n- Saved model file\n- Working prediction script",
                    "xp": 500,
                    "estimated_hours": 10,
                    "prereqs": ["level-2-16"],
                    "status": "locked"
                }
            ]
        },
        {
            "id": "zone-3",
            "title": "THE BRAIN",
            "subtitle": "Deep Learning",
            "description": "Mimic the human brain. Move from CPU to GPU.",
            "color": "#f59e0b",
            "icon": "🧠",
            "levels": [
                {
                    "id": "level-3-1",
                    "title": "The Perceptron",
                    "short": "The artificial neuron",
                    "details": "**Where It All Began**\n\nThe simplest neural network:\n\n- Weighted sum of inputs\n- Activation function (step/sign)\n- Single layer, linear decision boundary\n- Perceptron learning rule\n\nUnderstand the perceptron before moving to networks!",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-2-boss"],
                    "status": "locked"
                },
                {
                    "id": "level-3-2",
                    "title": "Activation Functions",
                    "short": "ReLU, Sigmoid, Tanh, Softmax",
                    "details": "**Adding Non-Linearity**\n\nActivation functions introduce non-linearity:\n\n- ReLU: max(0, x) - Most common\n- Sigmoid: 1/(1+e^(-x)) - Output layer for binary\n- Tanh: (e^x - e^(-x))/(e^x + e^(-x))\n- Softmax: Multi-class probabilities\n- Leaky ReLU, ELU, GELU variants\n\nWithout activations, deep networks = linear regression!",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-3-1"],
                    "status": "locked"
                },
                {
                    "id": "level-3-3",
                    "title": "Multi-Layer Perceptron",
                    "short": "MLP - Forward Propagation",
                    "details": "**Deep Neural Networks**\n\nStack layers for power:\n\n- Input → Hidden → ... → Output\n- Forward pass: Data flows through layers\n- Each layer: Linear transformation + activation\n- Universal approximation theorem\n\nImplement forward propagation from scratch!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-3-2"],
                    "status": "locked"
                },
                {
                    "id": "level-3-4",
                    "title": "Backpropagation",
                    "short": "The math of learning—deriving gradients",
                    "details": "**How Networks Learn**\n\nChain rule in action:\n\n- Compute loss gradient w.r.t. outputs\n- Propagate gradients backward\n- Update each weight based on its gradient\n- The algorithm that enabled deep learning\n\nDerive and implement backprop manually!",
                    "xp": 300,
                    "estimated_hours": 6,
                    "prereqs": ["level-3-3"],
                    "status": "locked"
                },
                {
                    "id": "level-3-5",
                    "title": "Optimizers",
                    "short": "SGD, RMSprop, Adam",
                    "details": "**Beyond Vanilla Gradient Descent**\n\nSmart update rules:\n\n- SGD: Stochastic Gradient Descent\n- Momentum: Accelerate in consistent directions\n- RMSprop: Adaptive learning rates\n- Adam: Momentum + RMSprop (default choice)\n- Learning rate scheduling\n\nAdam is usually the best starting point!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-3-4"],
                    "status": "locked"
                },
                {
                    "id": "level-3-6",
                    "title": "Intro to PyTorch",
                    "short": "Tensors, Autograd",
                    "details": "**The Deep Learning Framework**\n\nPyTorch fundamentals:\n\n- Tensors: GPU-accelerated arrays\n- Autograd: Automatic differentiation\n- .backward(): Compute gradients\n- .to('cuda'): Move to GPU\n- Dynamic computation graphs\n\nPyTorch is the researcher's choice!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-3-5"],
                    "status": "locked"
                },
                {
                    "id": "level-3-7",
                    "title": "Building ANNs in PyTorch",
                    "short": "nn.Module, DataLoaders, Training loops",
                    "details": "**Practical Deep Learning**\n\nPyTorch workflow:\n\n- nn.Module: Define model architecture\n- DataLoader: Batch data efficiently\n- Training loop: forward → loss → backward → step\n- Validation and testing\n- Model saving/loading\n\nBuild your first complete training pipeline!",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-3-6"],
                    "status": "locked"
                },
                {
                    "id": "level-3-8",
                    "title": "Convolutional Neural Networks",
                    "short": "CNNs - Convolutions, Padding, Stride",
                    "details": "**Vision AI Foundation**\n\nSpatially-aware networks:\n\n- Convolution: Sliding filter operation\n- Kernel/Filter: Learnable feature detector\n- Padding: Preserve spatial dimensions\n- Stride: Skip positions in convolution\n- Parameter sharing: Same filter everywhere\n\nCNNs revolutionized computer vision!",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-3-7"],
                    "status": "locked"
                },
                {
                    "id": "level-3-9",
                    "title": "Pooling Layers",
                    "short": "Max Pooling, Average Pooling",
                    "details": "**Downsampling Features**\n\nReduce spatial dimensions:\n\n- Max Pooling: Take maximum in window\n- Average Pooling: Take average in window\n- Reduces computation\n- Provides translation invariance\n- Global pooling for classification\n\nPooling makes CNNs robust to small shifts!",
                    "xp": 100,
                    "estimated_hours": 2,
                    "prereqs": ["level-3-8"],
                    "status": "locked"
                },
                {
                    "id": "level-3-10",
                    "title": "Famous Architectures",
                    "short": "ResNet, VGG, Inception",
                    "details": "**Standing on Giants' Shoulders**\n\nLandmark architectures:\n\n- VGG: Simple, deep, 3x3 convs\n- ResNet: Skip connections, very deep\n- Inception: Multiple filter sizes in parallel\n- EfficientNet: Balanced scaling\n\nStudy these to understand architecture design!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-3-9"],
                    "status": "locked"
                },
                {
                    "id": "level-3-11",
                    "title": "Transfer Learning",
                    "short": "Using pre-trained models on your own data",
                    "details": "**Leverage Existing Knowledge**\n\nDon't train from scratch:\n\n- Load pre-trained weights (ImageNet)\n- Freeze early layers\n- Fine-tune later layers on your data\n- Much faster, less data needed\n\n90% of real-world CV uses transfer learning!",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-3-10"],
                    "status": "locked"
                },
                {
                    "id": "level-3-12",
                    "title": "Recurrent Neural Networks",
                    "short": "RNNs - Handling time and sequences",
                    "details": "**Sequence Modeling**\n\nNetworks with memory:\n\n- Hidden state carries information through time\n- Same weights applied at each timestep\n- Backpropagation Through Time (BPTT)\n- Applications: Text, audio, time series\n\nRNNs process sequences of any length!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-3-11"],
                    "status": "locked"
                },
                {
                    "id": "level-3-13",
                    "title": "LSTMs & GRUs",
                    "short": "Solving the Vanishing Gradient problem",
                    "details": "**Long-Term Memory**\n\nGated recurrent units:\n\n- LSTM: Cell state + 3 gates (input, forget, output)\n- GRU: Simpler, 2 gates (reset, update)\n- Learn what to remember/forget\n- Capture long-range dependencies\n\nLSTMs replaced vanilla RNNs everywhere!",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-3-12"],
                    "status": "locked"
                },
                {
                    "id": "level-3-14",
                    "title": "Word Embeddings",
                    "short": "Word2Vec, GloVe - turning words into math",
                    "details": "**Words as Vectors**\n\nSemantic representation of words:\n\n- Word2Vec: Skip-gram, CBOW\n- GloVe: Global Vectors\n- Semantic relationships preserved\n- king - man + woman ≈ queen\n\nEmbeddings are the foundation of NLP!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-3-13"],
                    "status": "locked"
                },
                {
                    "id": "level-3-boss",
                    "title": "🎯 BOSS BATTLE: The Eye of God",
                    "short": "Computer Vision classifier with transfer learning",
                    "details": "**Zone 3 Final Challenge**\n\n**Task:** Build a Computer Vision Classifier\n\n1. Build a CNN using PyTorch\n2. Train it on a medical dataset (e.g., Pneumonia X-rays) or Satellite imagery\n3. Use Transfer Learning (ResNet50)\n4. **Bonus:** Use C++ skills to load the trained model using LibTorch for speed\n\n**Success Criteria:**\n- Accuracy > 90%\n- Proper train/val/test splits\n- Confusion matrix analysis\n- Saved model ready for deployment",
                    "xp": 600,
                    "estimated_hours": 12,
                    "prereqs": ["level-3-14"],
                    "status": "locked"
                }
            ]
        },
        {
            "id": "zone-4",
            "title": "THE ORACLE",
            "subtitle": "Generative AI & LLMs",
            "description": "Master the tech of 2025.",
            "color": "#10b981",
            "icon": "🔮",
            "levels": [
                {
                    "id": "level-4-1",
                    "title": "The Attention Mechanism",
                    "short": "Self-Attention, Multi-head attention",
                    "details": "**The Revolution**\n\nAttention is all you need:\n\n- Query, Key, Value (Q, K, V)\n- Attention scores: softmax(QK^T/√d)\n- Self-attention: Attend to same sequence\n- Multi-head: Multiple attention patterns\n\nAttention replaced RNNs for sequences!",
                    "xp": 300,
                    "estimated_hours": 6,
                    "prereqs": ["level-3-boss"],
                    "status": "locked"
                },
                {
                    "id": "level-4-2",
                    "title": "The Transformer Architecture",
                    "short": "Encoder-Decoder structure",
                    "details": "**The Foundation of Modern AI**\n\nTransformer components:\n\n- Encoder: Process input sequence\n- Decoder: Generate output sequence\n- Positional encoding: Add position info\n- Layer normalization\n- Feed-forward networks\n\nGPT, BERT, T5—all Transformers!",
                    "xp": 350,
                    "estimated_hours": 7,
                    "prereqs": ["level-4-1"],
                    "status": "locked"
                },
                {
                    "id": "level-4-3",
                    "title": "BERT vs GPT",
                    "short": "Bidirectional Encoder vs Generative Decoder",
                    "details": "**Two Paradigms**\n\nDifferent architectures for different tasks:\n\n- BERT: Bidirectional, encoder-only, understanding\n- GPT: Autoregressive, decoder-only, generation\n- BERT: Masked language modeling\n- GPT: Next token prediction\n\nBERT for classification, GPT for generation!",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-4-2"],
                    "status": "locked"
                },
                {
                    "id": "level-4-4",
                    "title": "Tokenization Strategies",
                    "short": "BPE, WordPiece, SentencePiece",
                    "details": "**Breaking Text into Pieces**\n\nSubword tokenization:\n\n- BPE: Byte Pair Encoding (GPT)\n- WordPiece: Similar to BPE (BERT)\n- SentencePiece: Language-agnostic\n- Vocabulary size tradeoffs\n\nTokenization affects model performance significantly!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-4-3"],
                    "status": "locked"
                },
                {
                    "id": "level-4-5",
                    "title": "Prompt Engineering",
                    "short": "Chain of Thought, Few-shot",
                    "details": "**Talking to AI**\n\nGet better outputs through better inputs:\n\n- Zero-shot: Just the question\n- Few-shot: Examples in the prompt\n- Chain of Thought: 'Let's think step by step'\n- System prompts and roles\n- Temperature and sampling\n\nPrompt engineering is a crucial skill!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-4-4"],
                    "status": "locked"
                },
                {
                    "id": "level-4-6",
                    "title": "Hugging Face Transformers",
                    "short": "Loading and using pre-trained models",
                    "details": "**The Model Hub**\n\nHugging Face ecosystem:\n\n- AutoModel, AutoTokenizer\n- Pipeline for easy inference\n- Model Hub: 100k+ models\n- Datasets library\n- Spaces for deployment\n\nHugging Face democratized NLP!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-4-5"],
                    "status": "locked"
                },
                {
                    "id": "level-4-7",
                    "title": "Vector Databases",
                    "short": "Pinecone, ChromaDB, FAISS",
                    "details": "**Semantic Search at Scale**\n\nStore and search embeddings:\n\n- FAISS: Facebook's similarity search\n- Pinecone: Managed vector DB\n- ChromaDB: Open-source, easy to use\n- Approximate Nearest Neighbors (ANN)\n- Indexing strategies (HNSW, IVF)\n\nVector DBs enable RAG applications!",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-4-6"],
                    "status": "locked"
                },
                {
                    "id": "level-4-8",
                    "title": "RAG Architecture",
                    "short": "Retrieval Augmented Generation",
                    "details": "**Ground LLMs in Facts**\n\nCombine retrieval with generation:\n\n- Index documents as embeddings\n- Retrieve relevant chunks for query\n- Augment prompt with context\n- Generate grounded response\n\nRAG reduces hallucinations and adds knowledge!",
                    "xp": 300,
                    "estimated_hours": 6,
                    "prereqs": ["level-4-7"],
                    "status": "locked"
                },
                {
                    "id": "level-4-9",
                    "title": "LangChain & LlamaIndex",
                    "short": "LLM application frameworks",
                    "details": "**Building LLM Applications**\n\nFrameworks for AI apps:\n\n- LangChain: Chains, agents, tools\n- LlamaIndex: Data + LLMs\n- Memory management\n- Tool use and function calling\n- Agent architectures\n\nBuild sophisticated AI applications!",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-4-8"],
                    "status": "locked"
                },
                {
                    "id": "level-4-10",
                    "title": "Quantization",
                    "short": "Running big models on small hardware - 4bit/8bit",
                    "details": "**Efficient Inference**\n\nReduce model size:\n\n- FP16: Half precision\n- INT8: 8-bit quantization\n- INT4: Extreme compression\n- GPTQ, AWQ, GGML formats\n- Quality vs speed tradeoff\n\nRun 70B models on consumer hardware!",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-4-9"],
                    "status": "locked"
                },
                {
                    "id": "level-4-11",
                    "title": "Fine-Tuning LLMs",
                    "short": "LoRA/PEFT - Parameter Efficient Fine Tuning",
                    "details": "**Customize Models**\n\nAdapt models efficiently:\n\n- Full fine-tuning: Update all weights\n- LoRA: Low-Rank Adaptation (small matrices)\n- PEFT: Parameter Efficient Fine Tuning\n- QLoRA: Quantized LoRA\n- Instruction tuning, RLHF basics\n\nFine-tune LLMs on your own data!",
                    "xp": 350,
                    "estimated_hours": 7,
                    "prereqs": ["level-4-10"],
                    "status": "locked"
                },
                {
                    "id": "level-4-boss",
                    "title": "🎯 BOSS BATTLE: The Corporate Brain",
                    "short": "Build a complete RAG application",
                    "details": "**Zone 4 Final Challenge**\n\n**Task:** Build a RAG Application\n\n1. Load a PDF (e.g., an HR policy document)\n2. Chunk it and store embeddings in a Vector DB (FAISS)\n3. Connect a localized LLM (like Llama-3 or Mistral)\n4. Create a chat interface where users ask questions about the PDF\n\n**Success Criteria:**\n- Working PDF ingestion\n- Semantic search retrieval\n- Coherent, grounded responses\n- Simple chat UI (Gradio/Streamlit)\n- Source citations in responses",
                    "xp": 700,
                    "estimated_hours": 15,
                    "prereqs": ["level-4-11"],
                    "status": "locked"
                }
            ]
        },
        {
            "id": "zone-5",
            "title": "THE ARCHITECT",
            "subtitle": "MLOps & Engineering",
            "description": "Productionize. Merge your IT background with AI.",
            "color": "#ec4899",
            "icon": "🏗️",
            "levels": [
                {
                    "id": "level-5-1",
                    "title": "APIs with FastAPI",
                    "short": "Serving your model",
                    "details": "**Model as a Service**\n\nBuild production APIs:\n\n- FastAPI: Modern Python web framework\n- Pydantic: Data validation\n- Async/await for performance\n- OpenAPI documentation automatic\n- Request/response models\n\nFastAPI is the standard for ML APIs!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-4-boss"],
                    "status": "locked"
                },
                {
                    "id": "level-5-2",
                    "title": "Dockerizing ML Models",
                    "short": "Creating container images",
                    "details": "**Containerization**\n\nPackage your model:\n\n- Dockerfile: Build instructions\n- Base images for ML (nvidia/cuda)\n- Multi-stage builds\n- Layer caching optimization\n- docker build, docker run\n\nContainers ensure reproducibility!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-5-1"],
                    "status": "locked"
                },
                {
                    "id": "level-5-3",
                    "title": "Docker Compose",
                    "short": "Running App + DB + Redis together",
                    "details": "**Multi-Container Applications**\n\nOrchestrate services locally:\n\n- docker-compose.yml: Define services\n- Networking between containers\n- Volume mounts for persistence\n- Environment variables\n- Development workflows\n\nCompose for local dev, Kubernetes for prod!",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-5-2"],
                    "status": "locked"
                },
                {
                    "id": "level-5-4",
                    "title": "CI/CD for ML",
                    "short": "GitHub Actions",
                    "details": "**Automated Pipelines**\n\nAutomate everything:\n\n- GitHub Actions workflows\n- Test on every PR\n- Build Docker images automatically\n- Push to container registry\n- Deploy on merge to main\n\nNever deploy manually again!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-5-3"],
                    "status": "locked"
                },
                {
                    "id": "level-5-5",
                    "title": "Kubernetes Basics for ML",
                    "short": "Deploying containers at scale",
                    "details": "**Container Orchestration**\n\nK8s fundamentals:\n\n- Pods, Deployments, Services\n- kubectl commands\n- YAML manifests\n- Scaling replicas\n- Load balancing\n\nKubernetes runs production ML at scale!",
                    "xp": 300,
                    "estimated_hours": 6,
                    "prereqs": ["level-5-4"],
                    "status": "locked"
                },
                {
                    "id": "level-5-6",
                    "title": "Model Registry",
                    "short": "MLflow - Versioning models",
                    "details": "**Model Management**\n\nTrack experiments and models:\n\n- MLflow Tracking: Log metrics, params\n- MLflow Models: Package models\n- Model Registry: Version control\n- Model staging/production\n- Experiment comparison\n\nMLflow is the standard for experiment tracking!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-5-5"],
                    "status": "locked"
                },
                {
                    "id": "level-5-7",
                    "title": "Data Validation",
                    "short": "Great Expectations",
                    "details": "**Data Quality**\n\nValidate data automatically:\n\n- Great Expectations: Define expectations\n- Schema validation\n- Distribution checks\n- Automated data docs\n- Integration with pipelines\n\nBad data = bad models. Validate everything!",
                    "xp": 150,
                    "estimated_hours": 3,
                    "prereqs": ["level-5-6"],
                    "status": "locked"
                },
                {
                    "id": "level-5-8",
                    "title": "Model Drift Monitoring",
                    "short": "Detecting when the model gets 'stupid'",
                    "details": "**Production Monitoring**\n\nDetect model degradation:\n\n- Data drift: Input distribution changes\n- Concept drift: Relationship changes\n- Prediction drift: Output distribution\n- Evidently, Alibi Detect tools\n- Alerting and retraining triggers\n\nModels degrade over time—monitor them!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-5-7"],
                    "status": "locked"
                },
                {
                    "id": "level-5-9",
                    "title": "ONNX",
                    "short": "Open Neural Network Exchange",
                    "details": "**Model Interoperability**\n\nStandard model format:\n\n- Export PyTorch/TensorFlow to ONNX\n- Run anywhere: ONNX Runtime\n- Optimized inference\n- Cross-platform deployment\n- Hardware acceleration\n\nONNX bridges frameworks and hardware!",
                    "xp": 200,
                    "estimated_hours": 4,
                    "prereqs": ["level-5-8"],
                    "status": "locked"
                },
                {
                    "id": "level-5-10",
                    "title": "TensorRT",
                    "short": "NVIDIA optimization",
                    "details": "**Maximum Performance**\n\nNVIDIA's inference optimizer:\n\n- Layer fusion\n- Precision calibration (FP16, INT8)\n- Kernel auto-tuning\n- 2-10x speedup\n- Integration with Triton\n\nTensorRT for production GPU inference!",
                    "xp": 250,
                    "estimated_hours": 5,
                    "prereqs": ["level-5-9"],
                    "status": "locked"
                },
                {
                    "id": "level-5-11",
                    "title": "Custom C++ PyTorch Operations",
                    "short": "Advanced performance optimization",
                    "details": "**Custom Extensions**\n\nWrite high-performance ops:\n\n- LibTorch: C++ PyTorch frontend\n- Custom CUDA kernels\n- JIT compilation\n- pybind11 Python bindings\n- Performance profiling\n\nYour C/C++ edge for maximum speed!",
                    "xp": 350,
                    "estimated_hours": 8,
                    "prereqs": ["level-5-10"],
                    "status": "locked"
                },
                {
                    "id": "level-5-boss",
                    "title": "🎯 FINAL BOSS: The End-to-End Platform",
                    "short": "Fully automated ML pipeline",
                    "details": "**The Ultimate Challenge**\n\n**Task:** Build a fully automated pipeline\n\n1. Bash script triggers data ingestion\n2. Python cleans data and trains a model\n3. MLflow logs the accuracy\n4. If accuracy > threshold, Docker builds a new image\n5. Kubernetes updates the live prediction endpoint\n6. You sit back and watch it run\n\n**Success Criteria:**\n- Automated end-to-end pipeline\n- Model versioning with MLflow\n- Containerized deployment\n- K8s rolling updates\n- Monitoring dashboard\n- Documentation\n\n**🎉 CONGRATULATIONS! You are now an AI Grandmaster!**",
                    "xp": 1000,
                    "estimated_hours": 20,
                    "prereqs": ["level-5-11"],
                    "status": "locked"
                }
            ]
        }
    ],
    "user": {
        "current_xp": 0,
        "badges": []
    }
};

// Expose the data globally
window.SKILLTREE_DATA = AI_GRANDMASTER_ROADMAP;

// Auto-load the data when the app is ready
function loadRoadmapData() {
    if (typeof window.SKILLTREE !== 'undefined' && typeof window.SKILLTREE.loadData === 'function') {
        window.SKILLTREE.loadData(AI_GRANDMASTER_ROADMAP);
        return true;
    }
    return false;
}

// Try to load immediately if SKILLTREE is already available
if (!loadRoadmapData()) {
    // Otherwise wait for DOMContentLoaded and try again
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadRoadmapData);
    } else {
        // DOM already loaded, wait a tick for app.js to initialize
        requestAnimationFrame(loadRoadmapData);
    }
}

