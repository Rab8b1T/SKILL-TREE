(function () {
    'use strict';

    // ========================================================================
    //  COMPREHENSIVE AI/ML ROADMAP DATA
    // ========================================================================

    const ROADMAP = [
        {
            id: 'phase-1',
            title: 'THE FORGE',
            subtitle: 'Mathematical Foundations',
            icon: '⚡',
            color: '#7c3aed',
            topics: [
                {
                    id: 't-1-1',
                    title: 'Linear Algebra Essentials',
                    short: 'Vectors, matrices, eigenvalues — the language of data transformations',
                    difficulty: 'beginner',
                    hours: 20,
                    xp: 200,
                    prereqs: [],
                    concepts: [
                        'Scalars, Vectors & Matrices — notation and operations',
                        'Dot product, cross product & geometric interpretation',
                        'Matrix multiplication — the engine of neural networks',
                        'Transpose, inverse & determinant',
                        'Eigenvalues & eigenvectors — understanding PCA',
                        'Singular Value Decomposition (SVD)',
                    ],
                    resources: [
                        { title: '3Blue1Brown — Essence of Linear Algebra', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab', type: 'video' },
                        { title: 'MIT 18.06 — Gilbert Strang', url: 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/', type: 'course' },
                        { title: 'Khan Academy — Linear Algebra', url: 'https://www.khanacademy.org/math/linear-algebra', type: 'course' },
                        { title: 'Linear Algebra Done Right — Sheldon Axler', url: 'https://linear.axler.net/', type: 'book' },
                        { title: 'NumPy Linear Algebra Tutorial', url: 'https://numpy.org/doc/stable/reference/routines.linalg.html', type: 'docs' },
                    ],
                    projects: [
                        'Implement matrix operations from scratch in Python',
                        'Visualize 2D/3D vector transformations with Matplotlib',
                        'Build an image compression tool using SVD',
                    ],
                    details: 'Linear algebra is the backbone of machine learning. Every neural network forward pass is a series of matrix multiplications. Understanding how vectors transform through spaces gives you intuition for how data flows through models.\n\nStart with **3Blue1Brown\'s visual series** — it builds geometric intuition. Then solidify with MIT 18.06 for rigorous understanding.',
                },
                {
                    id: 't-1-2',
                    title: 'Calculus for Machine Learning',
                    short: 'Derivatives, gradients, chain rule — the math behind optimization',
                    difficulty: 'beginner',
                    hours: 18,
                    xp: 200,
                    prereqs: [],
                    concepts: [
                        'Derivatives — rate of change, slopes of curves',
                        'Partial derivatives — multi-variable functions',
                        'The gradient vector — direction of steepest ascent',
                        'Chain rule — how changes propagate through systems',
                        'Jacobian & Hessian matrices',
                        'Taylor series approximation',
                    ],
                    resources: [
                        { title: '3Blue1Brown — Essence of Calculus', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr', type: 'video' },
                        { title: 'Khan Academy — Multivariable Calculus', url: 'https://www.khanacademy.org/math/multivariable-calculus', type: 'course' },
                        { title: 'Mathematics for Machine Learning (Book)', url: 'https://mml-book.github.io/', type: 'book' },
                        { title: 'Deep Learning Book — Ch. 4 Numerical Computation', url: 'https://www.deeplearningbook.org/contents/numerical.html', type: 'book' },
                    ],
                    projects: [
                        'Implement gradient descent from scratch',
                        'Visualize gradient flow on 3D surfaces',
                        'Build a simple auto-differentiation engine',
                    ],
                    details: 'Calculus tells us **how to optimize**. Every time a neural network learns, it uses derivatives to figure out which direction to adjust its weights. The chain rule is especially critical — it\'s the mathematical foundation of backpropagation.\n\nFocus on building intuition for **gradients** — they point in the direction of steepest increase of a function.',
                },
                {
                    id: 't-1-3',
                    title: 'Probability & Statistics',
                    short: 'Distributions, Bayes theorem, hypothesis testing — reasoning under uncertainty',
                    difficulty: 'beginner',
                    hours: 22,
                    xp: 250,
                    prereqs: [],
                    concepts: [
                        'Random variables, PMFs & PDFs',
                        'Common distributions: Normal, Bernoulli, Poisson, Uniform',
                        'Expected value, variance & standard deviation',
                        'Bayes\' theorem & conditional probability',
                        'Maximum Likelihood Estimation (MLE)',
                        'Hypothesis testing, p-values & confidence intervals',
                    ],
                    resources: [
                        { title: 'StatQuest — Statistics Fundamentals', url: 'https://www.youtube.com/playlist?list=PLblh5JKOoLUK0FLuzwntyYI10UQFUhsY9', type: 'video' },
                        { title: 'MIT 6.041 — Probabilistic Systems', url: 'https://ocw.mit.edu/courses/6-041-probabilistic-systems-analysis-and-applied-probability-fall-2010/', type: 'course' },
                        { title: 'Think Stats — Allen Downey', url: 'https://greenteapress.com/thinkstats2/', type: 'book' },
                        { title: 'Seeing Theory — Visual Intro to Probability', url: 'https://seeing-theory.brown.edu/', type: 'tool' },
                    ],
                    projects: [
                        'Build a Naive Bayes spam classifier from scratch',
                        'Simulate the Monty Hall problem with 10,000 trials',
                        'Perform A/B test analysis on real marketing data',
                    ],
                    details: 'ML models reason under **uncertainty**. Probability tells us how to quantify uncertainty, and statistics tells us how to make decisions from data. Bayes\' theorem is the foundation of many ML algorithms.\n\n**MLE** is how most models are trained — find the parameters that make the observed data most likely.',
                },
                {
                    id: 't-1-4',
                    title: 'Optimization Theory',
                    short: 'Gradient descent, convexity, convergence — finding the best solution',
                    difficulty: 'intermediate',
                    hours: 15,
                    xp: 250,
                    prereqs: ['t-1-2'],
                    concepts: [
                        'Convex vs non-convex optimization',
                        'Gradient Descent — batch, mini-batch, stochastic',
                        'Learning rate & convergence',
                        'Momentum, RMSProp & Adam optimizer',
                        'Lagrange multipliers & constrained optimization',
                        'Local minima, saddle points & loss landscapes',
                    ],
                    resources: [
                        { title: 'Stanford Convex Optimization (Boyd)', url: 'https://web.stanford.edu/~boyd/cvxbook/', type: 'book' },
                        { title: 'Distill — Why Momentum Really Works', url: 'https://distill.pub/2017/momentum/', type: 'article' },
                        { title: 'An Overview of Gradient Descent Optimizers', url: 'https://ruder.io/optimizing-gradient-descent/', type: 'article' },
                        { title: 'Visualizing Optimization Algorithms', url: 'https://github.com/Jaewan-Yun/optimizer-visualization', type: 'tool' },
                    ],
                    projects: [
                        'Implement SGD, Momentum, Adam from scratch',
                        'Visualize optimizer trajectories on Rosenbrock function',
                        'Compare convergence speed across optimizers on MNIST',
                    ],
                    details: 'Optimization is **how models learn**. Every training loop is an optimization problem: minimize the loss function by adjusting weights. Understanding different optimizers helps you train models faster and more reliably.\n\nStart with vanilla gradient descent, then understand why **Adam** is the default choice in practice.',
                },
                {
                    id: 't-1-5',
                    title: 'Information Theory Basics',
                    short: 'Entropy, KL divergence, cross-entropy — measuring information',
                    difficulty: 'intermediate',
                    hours: 10,
                    xp: 200,
                    prereqs: ['t-1-3'],
                    concepts: [
                        'Shannon entropy — measuring uncertainty',
                        'Cross-entropy — the most common loss function',
                        'KL divergence — comparing distributions',
                        'Mutual information',
                        'Information gain in decision trees',
                    ],
                    resources: [
                        { title: 'Visual Information Theory — Chris Olah', url: 'https://colah.github.io/posts/2015-09-Visual-Information/', type: 'article' },
                        { title: 'A Short Introduction to Entropy & Cross-Entropy', url: 'https://machinelearningmastery.com/cross-entropy-for-machine-learning/', type: 'article' },
                        { title: 'Elements of Information Theory — Cover & Thomas', url: 'https://www.wiley.com/en-us/Elements+of+Information+Theory%2C+2nd+Edition-p-9780471241959', type: 'book' },
                    ],
                    projects: [
                        'Compute entropy of various probability distributions',
                        'Implement cross-entropy loss from scratch',
                        'Build a decision tree using information gain splitting',
                    ],
                    details: 'Information theory provides the **loss functions** used to train neural networks. Cross-entropy loss is ubiquitous in classification. KL divergence is used in VAEs, knowledge distillation, and RLHF.\n\nChris Olah\'s blog post is the best visual introduction.',
                },
            ],
        },
        {
            id: 'phase-2',
            title: 'THE CODE',
            subtitle: 'Programming & Data Engineering',
            icon: '💻',
            color: '#06b6d4',
            topics: [
                {
                    id: 't-2-1',
                    title: 'Python for AI/ML',
                    short: 'Core Python, OOP, generators, decorators — your primary weapon',
                    difficulty: 'beginner',
                    hours: 30,
                    xp: 300,
                    prereqs: [],
                    concepts: [
                        'Data structures: lists, dicts, sets, tuples',
                        'List/dict comprehensions & generators',
                        'OOP: classes, inheritance, magic methods',
                        'Decorators & context managers',
                        'Type hints & modern Python (3.10+)',
                        'Virtual environments & package management',
                    ],
                    resources: [
                        { title: 'Python Official Tutorial', url: 'https://docs.python.org/3/tutorial/', type: 'docs' },
                        { title: 'Automate the Boring Stuff', url: 'https://automatetheboringstuff.com/', type: 'book' },
                        { title: 'Real Python — Tutorials', url: 'https://realpython.com/', type: 'article' },
                        { title: 'Fluent Python — Luciano Ramalho', url: 'https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/', type: 'book' },
                    ],
                    projects: [
                        'Build a CLI data analysis tool',
                        'Create a web scraper for ML datasets',
                        'Implement common data structures from scratch',
                    ],
                    details: 'Python is the lingua franca of AI/ML. You need to be fluent — not just functional. Focus on writing **Pythonic** code: generators for memory efficiency, comprehensions for clarity, decorators for clean abstractions.\n\nMastering Python makes everything else easier.',
                },
                {
                    id: 't-2-2',
                    title: 'NumPy & Scientific Computing',
                    short: 'Vectorized operations, broadcasting, array manipulation — fast math in Python',
                    difficulty: 'beginner',
                    hours: 15,
                    xp: 200,
                    prereqs: ['t-2-1'],
                    concepts: [
                        'ndarray creation, indexing & slicing',
                        'Broadcasting rules & vectorized operations',
                        'Linear algebra operations with np.linalg',
                        'Random number generation & seeding',
                        'Memory layout: C vs Fortran order',
                        'Performance: avoiding Python loops',
                    ],
                    resources: [
                        { title: 'NumPy Official Quickstart', url: 'https://numpy.org/doc/stable/user/quickstart.html', type: 'docs' },
                        { title: 'From Python to NumPy — Nicolas Rougier', url: 'https://www.labri.fr/perso/nrougier/from-python-to-numpy/', type: 'book' },
                        { title: 'Stanford CS231n — NumPy Tutorial', url: 'https://cs231n.github.io/python-numpy-tutorial/', type: 'article' },
                    ],
                    projects: [
                        'Implement k-means clustering using only NumPy',
                        'Build a simple neural network with NumPy only',
                        'Process and transform image data using array operations',
                    ],
                    details: 'NumPy is the foundation that PyTorch and TensorFlow are built upon. **Vectorized operations** are 10–100x faster than Python loops. Understanding broadcasting is essential for writing efficient ML code.\n\nThe "From Python to NumPy" guide is excellent for going from beginner to expert.',
                },
                {
                    id: 't-2-3',
                    title: 'Data Wrangling with Pandas',
                    short: 'DataFrames, cleaning, merging, pivoting — taming messy real-world data',
                    difficulty: 'beginner',
                    hours: 20,
                    xp: 200,
                    prereqs: ['t-2-2'],
                    concepts: [
                        'Series & DataFrame — core data structures',
                        'Selecting, filtering & indexing data',
                        'Handling missing values & duplicates',
                        'Merging, joining & concatenating datasets',
                        'GroupBy, pivot tables & aggregation',
                        'Time series handling',
                    ],
                    resources: [
                        { title: 'Pandas Official — 10 Minutes to Pandas', url: 'https://pandas.pydata.org/docs/user_guide/10min.html', type: 'docs' },
                        { title: 'Kaggle — Pandas Course', url: 'https://www.kaggle.com/learn/pandas', type: 'course' },
                        { title: 'Python for Data Analysis — Wes McKinney', url: 'https://wesmckinney.com/book/', type: 'book' },
                    ],
                    projects: [
                        'Clean and analyze a messy Kaggle dataset',
                        'Build an automated data quality report generator',
                        'Perform exploratory data analysis on a real dataset',
                    ],
                    details: 'In practice, **80% of ML work is data preparation**. Pandas is your primary tool for loading, cleaning, transforming, and exploring tabular data. Master GroupBy and merging — you\'ll use them constantly.\n\nLearn to think in terms of vectorized operations, not row-by-row iteration.',
                },
                {
                    id: 't-2-4',
                    title: 'Data Visualization',
                    short: 'Matplotlib, Seaborn, Plotly — turning data into visual insights',
                    difficulty: 'beginner',
                    hours: 12,
                    xp: 150,
                    prereqs: ['t-2-3'],
                    concepts: [
                        'Matplotlib: figures, axes, subplots',
                        'Seaborn: statistical visualizations',
                        'Distribution plots: histograms, KDE, box plots',
                        'Relationship plots: scatter, heatmaps, pair plots',
                        'Interactive visualization with Plotly',
                        'Choosing the right chart for your data',
                    ],
                    resources: [
                        { title: 'Matplotlib Official Tutorials', url: 'https://matplotlib.org/stable/tutorials/index.html', type: 'docs' },
                        { title: 'Seaborn Tutorial', url: 'https://seaborn.pydata.org/tutorial.html', type: 'docs' },
                        { title: 'From Data to Viz — Decision Helper', url: 'https://www.data-to-viz.com/', type: 'tool' },
                        { title: 'Plotly Python Docs', url: 'https://plotly.com/python/', type: 'docs' },
                    ],
                    projects: [
                        'Create a comprehensive EDA visualization dashboard',
                        'Visualize model training metrics (loss, accuracy curves)',
                        'Build an interactive data exploration tool with Plotly',
                    ],
                    details: 'Visualization is how you **understand your data** before modeling and **communicate results** after. Learn Matplotlib fundamentals first (it underlies Seaborn), then use Seaborn for beautiful statistical plots.\n\nThe "From Data to Viz" website is an amazing reference for picking the right chart type.',
                },
                {
                    id: 't-2-5',
                    title: 'SQL & Data Storage',
                    short: 'Queries, joins, indexing, databases — accessing and managing data at scale',
                    difficulty: 'beginner',
                    hours: 15,
                    xp: 150,
                    prereqs: ['t-2-1'],
                    concepts: [
                        'SELECT, WHERE, ORDER BY, LIMIT',
                        'JOINs: INNER, LEFT, RIGHT, FULL',
                        'GROUP BY, HAVING & aggregation functions',
                        'Subqueries & CTEs (Common Table Expressions)',
                        'Indexing & query optimization',
                        'Working with databases from Python (SQLAlchemy)',
                    ],
                    resources: [
                        { title: 'SQLBolt — Interactive SQL Tutorial', url: 'https://sqlbolt.com/', type: 'course' },
                        { title: 'Mode Analytics — SQL Tutorial', url: 'https://mode.com/sql-tutorial/', type: 'course' },
                        { title: 'Kaggle — Intro to SQL', url: 'https://www.kaggle.com/learn/intro-to-sql', type: 'course' },
                        { title: 'SQLAlchemy Documentation', url: 'https://docs.sqlalchemy.org/', type: 'docs' },
                    ],
                    projects: [
                        'Query a real-world database (e.g., Stack Overflow data)',
                        'Build a data pipeline that extracts, transforms, loads (ETL)',
                        'Design a schema for storing ML experiment results',
                    ],
                    details: 'Most real-world data lives in databases. You need to be comfortable writing SQL queries to extract training data. Many ML companies expect SQL proficiency in interviews.\n\nFocus on **JOINs and aggregations** — they\'re the bread and butter of data extraction.',
                },
            ],
        },
        {
            id: 'phase-3',
            title: 'THE PREDICTOR',
            subtitle: 'Machine Learning Core',
            icon: '🎯',
            color: '#10b981',
            topics: [
                {
                    id: 't-3-1',
                    title: 'Supervised Learning: Regression',
                    short: 'Linear regression, regularization, polynomial features — predicting continuous values',
                    difficulty: 'intermediate',
                    hours: 18,
                    xp: 250,
                    prereqs: ['t-1-1', 't-1-2', 't-2-3'],
                    concepts: [
                        'Simple & multiple linear regression',
                        'Cost function: MSE, MAE, RMSE',
                        'Normal equation vs gradient descent',
                        'Polynomial regression & feature engineering',
                        'Regularization: L1 (Lasso), L2 (Ridge), Elastic Net',
                        'Bias-variance tradeoff',
                    ],
                    resources: [
                        { title: 'Andrew Ng — Machine Learning Specialization', url: 'https://www.coursera.org/specializations/machine-learning-introduction', type: 'course' },
                        { title: 'Scikit-learn — Linear Models Guide', url: 'https://scikit-learn.org/stable/modules/linear_model.html', type: 'docs' },
                        { title: 'StatQuest — Linear Regression', url: 'https://www.youtube.com/watch?v=PaFPbb66DxQ', type: 'video' },
                        { title: 'Hands-On ML — Ch. 4', url: 'https://www.oreilly.com/library/view/hands-on-machine-learning/9781098125967/', type: 'book' },
                    ],
                    projects: [
                        'Predict house prices with multiple regression',
                        'Implement linear regression from scratch with gradient descent',
                        'Compare L1/L2 regularization effects on overfitting',
                    ],
                    details: 'Linear regression is the **hello world** of ML. It\'s simple enough to understand deeply but powerful enough to solve real problems. The concepts you learn here — loss functions, gradient descent, regularization — transfer directly to deep learning.\n\nAndrew Ng\'s course is the gold standard starting point.',
                },
                {
                    id: 't-3-2',
                    title: 'Supervised Learning: Classification',
                    short: 'Logistic regression, SVM, decision trees, k-NN — categorizing data',
                    difficulty: 'intermediate',
                    hours: 22,
                    xp: 300,
                    prereqs: ['t-3-1'],
                    concepts: [
                        'Logistic regression & sigmoid function',
                        'Decision boundaries',
                        'Support Vector Machines (SVM) & kernels',
                        'Decision Trees & pruning',
                        'k-Nearest Neighbors (k-NN)',
                        'Multi-class classification: one-vs-all, softmax',
                    ],
                    resources: [
                        { title: 'Stanford CS229 — Machine Learning', url: 'https://cs229.stanford.edu/', type: 'course' },
                        { title: 'Scikit-learn — Classification Guide', url: 'https://scikit-learn.org/stable/supervised_learning.html', type: 'docs' },
                        { title: 'StatQuest — Classification Playlist', url: 'https://www.youtube.com/playlist?list=PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF', type: 'video' },
                        { title: 'Hands-On ML — Ch. 3, 5, 6', url: 'https://www.oreilly.com/library/view/hands-on-machine-learning/9781098125967/', type: 'book' },
                    ],
                    projects: [
                        'Build a multi-class image classifier (without deep learning)',
                        'Implement logistic regression from scratch',
                        'Compare SVM, Decision Tree, k-NN on the same dataset',
                    ],
                    details: 'Classification is the most common ML task in industry — spam detection, fraud detection, medical diagnosis, sentiment analysis. Master logistic regression first; it\'s the basis for neural network output layers.\n\nUnderstand the **decision boundary** concept — it\'s key to intuition.',
                },
                {
                    id: 't-3-3',
                    title: 'Unsupervised Learning',
                    short: 'Clustering, dimensionality reduction, anomaly detection — finding hidden patterns',
                    difficulty: 'intermediate',
                    hours: 18,
                    xp: 250,
                    prereqs: ['t-1-1', 't-3-1'],
                    concepts: [
                        'K-Means clustering & elbow method',
                        'Hierarchical clustering & dendrograms',
                        'DBSCAN — density-based clustering',
                        'PCA — Principal Component Analysis',
                        't-SNE & UMAP for visualization',
                        'Anomaly detection: Isolation Forest, LOF',
                    ],
                    resources: [
                        { title: 'Scikit-learn — Clustering Guide', url: 'https://scikit-learn.org/stable/modules/clustering.html', type: 'docs' },
                        { title: 'StatQuest — PCA', url: 'https://www.youtube.com/watch?v=FgakZw6K1QQ', type: 'video' },
                        { title: 'Distill — How to Use t-SNE Effectively', url: 'https://distill.pub/2016/misread-tsne/', type: 'article' },
                        { title: 'UMAP Documentation', url: 'https://umap-learn.readthedocs.io/', type: 'docs' },
                    ],
                    projects: [
                        'Segment customers using K-Means on purchase data',
                        'Reduce dimensionality of a high-dim dataset and visualize with t-SNE',
                        'Build an anomaly detection system for network traffic',
                    ],
                    details: 'Unsupervised learning finds **structure in unlabeled data**. PCA is essential for dimensionality reduction. Clustering helps discover natural groupings. These techniques are also used as preprocessing steps for supervised learning.\n\nt-SNE/UMAP are indispensable for **visualizing high-dimensional data**.',
                },
                {
                    id: 't-3-4',
                    title: 'Model Evaluation & Tuning',
                    short: 'Cross-validation, metrics, hyperparameter tuning — building reliable models',
                    difficulty: 'intermediate',
                    hours: 15,
                    xp: 250,
                    prereqs: ['t-3-2'],
                    concepts: [
                        'Train/validation/test split strategy',
                        'k-Fold cross-validation',
                        'Classification metrics: accuracy, precision, recall, F1, AUC-ROC',
                        'Regression metrics: MSE, RMSE, MAE, R²',
                        'Confusion matrix & classification report',
                        'Hyperparameter tuning: Grid Search, Random Search, Bayesian Optimization',
                    ],
                    resources: [
                        { title: 'Scikit-learn — Model Selection Guide', url: 'https://scikit-learn.org/stable/model_selection.html', type: 'docs' },
                        { title: 'StatQuest — ROC and AUC', url: 'https://www.youtube.com/watch?v=4jRBRDbJemM', type: 'video' },
                        { title: 'Optuna — Hyperparameter Optimization', url: 'https://optuna.org/', type: 'tool' },
                        { title: 'Neptune AI — ML Metrics Guide', url: 'https://neptune.ai/blog/performance-metrics-in-machine-learning-complete-guide', type: 'article' },
                    ],
                    projects: [
                        'Build a model evaluation pipeline with cross-validation',
                        'Use Optuna to optimize XGBoost hyperparameters',
                        'Create a metrics dashboard comparing multiple models',
                    ],
                    details: 'A model is only as good as your ability to **evaluate it properly**. Poor evaluation leads to overfit models that fail in production. Always use cross-validation, never evaluate on training data.\n\nLearn to choose the **right metric** for the problem — accuracy is often misleading for imbalanced datasets.',
                },
                {
                    id: 't-3-5',
                    title: 'Ensemble Methods',
                    short: 'Random Forest, XGBoost, LightGBM, stacking — combining models for superior results',
                    difficulty: 'intermediate',
                    hours: 18,
                    xp: 300,
                    prereqs: ['t-3-4'],
                    concepts: [
                        'Bagging — Bootstrap Aggregating',
                        'Random Forests — feature randomization',
                        'Boosting — sequential error correction',
                        'XGBoost, LightGBM, CatBoost — gradient boosted trees',
                        'Stacking & blending — meta-learners',
                        'Feature importance & SHAP values',
                    ],
                    resources: [
                        { title: 'StatQuest — Random Forests', url: 'https://www.youtube.com/watch?v=J4Wdy0Wc_xQ', type: 'video' },
                        { title: 'XGBoost Documentation', url: 'https://xgboost.readthedocs.io/', type: 'docs' },
                        { title: 'LightGBM Documentation', url: 'https://lightgbm.readthedocs.io/', type: 'docs' },
                        { title: 'SHAP — Explainability Library', url: 'https://shap.readthedocs.io/', type: 'tool' },
                        { title: 'Kaggle — Intro to ML (Ensemble Section)', url: 'https://www.kaggle.com/learn/intro-to-machine-learning', type: 'course' },
                    ],
                    projects: [
                        'Win a Kaggle tabular competition using XGBoost/LightGBM',
                        'Build a stacking ensemble with diverse base learners',
                        'Use SHAP to explain model predictions to stakeholders',
                    ],
                    details: 'Ensembles are the **kings of tabular data**. XGBoost and LightGBM dominate Kaggle competitions for structured data. They often outperform deep learning on tabular datasets.\n\n**SHAP values** are essential for model interpretability — every ML engineer should know them.',
                },
            ],
        },
        {
            id: 'phase-4',
            title: 'THE BRAIN',
            subtitle: 'Deep Learning',
            icon: '🧠',
            color: '#f59e0b',
            topics: [
                {
                    id: 't-4-1',
                    title: 'Neural Network Fundamentals',
                    short: 'Perceptrons, activation functions, backpropagation — how networks learn',
                    difficulty: 'intermediate',
                    hours: 25,
                    xp: 350,
                    prereqs: ['t-1-2', 't-1-4', 't-3-2'],
                    concepts: [
                        'Perceptron & multi-layer perceptron (MLP)',
                        'Activation functions: ReLU, sigmoid, tanh, GELU',
                        'Forward propagation',
                        'Loss functions: Cross-entropy, MSE',
                        'Backpropagation & computational graphs',
                        'Batch normalization & dropout',
                    ],
                    resources: [
                        { title: '3Blue1Brown — Neural Networks', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi', type: 'video' },
                        { title: 'Stanford CS231n — Convolutional Neural Networks', url: 'https://cs231n.stanford.edu/', type: 'course' },
                        { title: 'Deep Learning Book — Goodfellow et al.', url: 'https://www.deeplearningbook.org/', type: 'book' },
                        { title: 'PyTorch Tutorials', url: 'https://pytorch.org/tutorials/', type: 'docs' },
                        { title: 'Andrej Karpathy — Building micrograd', url: 'https://www.youtube.com/watch?v=VMj-3S1tku0', type: 'video' },
                    ],
                    projects: [
                        'Build a neural network from scratch (no frameworks)',
                        'Implement backpropagation step by step',
                        'Train an MLP on MNIST with PyTorch',
                    ],
                    details: 'This is where the magic begins. Neural networks are **universal function approximators** — they can learn any mapping from inputs to outputs given enough data and capacity.\n\n**Watch Karpathy\'s micrograd video** — building an autograd engine from scratch gives you deep understanding of backpropagation.',
                },
                {
                    id: 't-4-2',
                    title: 'PyTorch Mastery',
                    short: 'Tensors, autograd, nn.Module, DataLoaders — the deep learning framework',
                    difficulty: 'intermediate',
                    hours: 25,
                    xp: 300,
                    prereqs: ['t-4-1'],
                    concepts: [
                        'Tensors — creation, operations, GPU transfer',
                        'Autograd — automatic differentiation',
                        'nn.Module — building custom layers and models',
                        'DataLoader & Dataset — efficient data loading',
                        'Training loops — loss, optimizer, scheduler',
                        'Saving, loading & checkpointing models',
                    ],
                    resources: [
                        { title: 'PyTorch Official Tutorials', url: 'https://pytorch.org/tutorials/', type: 'docs' },
                        { title: 'Fast.ai — Practical Deep Learning', url: 'https://course.fast.ai/', type: 'course' },
                        { title: 'PyTorch Lightning Documentation', url: 'https://lightning.ai/docs/pytorch/stable/', type: 'docs' },
                        { title: 'Andrej Karpathy — makemore series', url: 'https://www.youtube.com/watch?v=PaCmpygFfXo', type: 'video' },
                    ],
                    projects: [
                        'Build a complete training pipeline with validation & checkpointing',
                        'Create a custom Dataset and DataLoader for your own data',
                        'Train a model on GPU and profile performance',
                    ],
                    details: 'PyTorch is the **industry standard** for deep learning research and increasingly for production. Its eager execution and Pythonic API make it intuitive to debug and extend.\n\n**Fast.ai\'s course** is the best way to learn practical deep learning quickly. Karpathy\'s makemore series builds intuition from scratch.',
                },
                {
                    id: 't-4-3',
                    title: 'Convolutional Neural Networks',
                    short: 'Convolutions, pooling, architectures — understanding visual data',
                    difficulty: 'advanced',
                    hours: 22,
                    xp: 350,
                    prereqs: ['t-4-2'],
                    concepts: [
                        'Convolution operation & filters/kernels',
                        'Stride, padding & output size calculation',
                        'Pooling layers: max pooling, average pooling',
                        'Classic architectures: LeNet, AlexNet, VGG, ResNet',
                        'Transfer learning & fine-tuning pretrained models',
                        'Data augmentation for computer vision',
                    ],
                    resources: [
                        { title: 'Stanford CS231n — CNN Lectures', url: 'https://cs231n.stanford.edu/', type: 'course' },
                        { title: 'CNN Explainer — Interactive Visualization', url: 'https://poloclub.github.io/cnn-explainer/', type: 'tool' },
                        { title: 'PyTorch Vision — torchvision', url: 'https://pytorch.org/vision/', type: 'docs' },
                        { title: 'Deep Residual Learning — He et al. (ResNet paper)', url: 'https://arxiv.org/abs/1512.03385', type: 'article' },
                    ],
                    projects: [
                        'Build an image classifier using a CNN from scratch',
                        'Fine-tune a ResNet model for a custom dataset',
                        'Visualize learned filters and feature maps',
                    ],
                    details: 'CNNs revolutionized computer vision. They exploit **spatial hierarchy** — low-level features (edges, textures) combine into high-level features (objects, scenes). ResNet\'s skip connections solved the vanishing gradient problem for very deep networks.\n\n**Transfer learning** is essential — almost nobody trains CNNs from scratch anymore.',
                },
                {
                    id: 't-4-4',
                    title: 'Recurrent Neural Networks & LSTMs',
                    short: 'Sequence modeling, memory cells, gating — processing sequential data',
                    difficulty: 'advanced',
                    hours: 18,
                    xp: 300,
                    prereqs: ['t-4-2'],
                    concepts: [
                        'Vanilla RNN & the vanishing gradient problem',
                        'LSTM — Long Short-Term Memory cells',
                        'GRU — Gated Recurrent Unit',
                        'Bidirectional RNNs',
                        'Sequence-to-sequence architecture',
                        'Teacher forcing & beam search',
                    ],
                    resources: [
                        { title: 'Understanding LSTM Networks — Chris Olah', url: 'https://colah.github.io/posts/2015-08-Understanding-LSTMs/', type: 'article' },
                        { title: 'Stanford CS224n — NLP with Deep Learning', url: 'https://web.stanford.edu/class/cs224n/', type: 'course' },
                        { title: 'The Unreasonable Effectiveness of RNNs — Karpathy', url: 'https://karpathy.github.io/2015/05/21/rnn-effectiveness/', type: 'article' },
                        { title: 'PyTorch RNN Tutorial', url: 'https://pytorch.org/tutorials/intermediate/char_rnn_classification_tutorial.html', type: 'docs' },
                    ],
                    projects: [
                        'Build a character-level text generator with LSTM',
                        'Implement a sentiment analysis model using bidirectional LSTM',
                        'Create a time-series forecasting model (stock prices, weather)',
                    ],
                    details: 'RNNs process **sequential data** — text, time series, audio. While largely superseded by Transformers for NLP, understanding RNNs builds intuition for sequence modeling.\n\nChris Olah\'s LSTM blog post is one of the best ML explanations ever written.',
                },
                {
                    id: 't-4-5',
                    title: 'Regularization & Training Techniques',
                    short: 'Dropout, early stopping, weight decay, learning rate scheduling — training robust models',
                    difficulty: 'intermediate',
                    hours: 12,
                    xp: 200,
                    prereqs: ['t-4-2'],
                    concepts: [
                        'Overfitting vs underfitting — diagnosing with learning curves',
                        'Dropout — randomly disabling neurons',
                        'Weight decay / L2 regularization',
                        'Early stopping — when to stop training',
                        'Learning rate schedulers: step, cosine, warmup',
                        'Mixed precision training (FP16/BF16)',
                    ],
                    resources: [
                        { title: 'Deep Learning Book — Ch. 7 Regularization', url: 'https://www.deeplearningbook.org/contents/regularization.html', type: 'book' },
                        { title: 'Andrej Karpathy — A Recipe for Training NNs', url: 'https://karpathy.github.io/2019/04/25/recipe/', type: 'article' },
                        { title: 'PyTorch — Learning Rate Schedulers', url: 'https://pytorch.org/docs/stable/optim.html#how-to-adjust-learning-rate', type: 'docs' },
                    ],
                    projects: [
                        'Demonstrate overfitting and fix it with regularization',
                        'Implement cosine annealing with warmup scheduler',
                        'Compare FP32 vs FP16 training speed and memory usage',
                    ],
                    details: 'The difference between a mediocre model and a great one often comes down to **training technique**. Karpathy\'s "Recipe for Training Neural Networks" is required reading for every practitioner.\n\nLearning rate is the single most important hyperparameter. Master scheduling strategies.',
                },
            ],
        },
        {
            id: 'phase-5',
            title: 'THE LINGUIST',
            subtitle: 'Natural Language Processing',
            icon: '📝',
            color: '#ec4899',
            topics: [
                {
                    id: 't-5-1',
                    title: 'Text Processing & Representation',
                    short: 'Tokenization, TF-IDF, Bag of Words — turning text into numbers',
                    difficulty: 'intermediate',
                    hours: 12,
                    xp: 200,
                    prereqs: ['t-2-3', 't-3-2'],
                    concepts: [
                        'Text cleaning: lowercasing, stopwords, stemming, lemmatization',
                        'Tokenization: word, subword, character level',
                        'Bag of Words & TF-IDF',
                        'N-grams & language models',
                        'Regex for text extraction',
                        'NLTK & spaCy basics',
                    ],
                    resources: [
                        { title: 'spaCy — Industrial NLP', url: 'https://spacy.io/', type: 'docs' },
                        { title: 'NLTK Book — Natural Language Processing with Python', url: 'https://www.nltk.org/book/', type: 'book' },
                        { title: 'Kaggle — NLP Getting Started', url: 'https://www.kaggle.com/competitions/nlp-getting-started', type: 'course' },
                    ],
                    projects: [
                        'Build a text classification pipeline with TF-IDF + SVM',
                        'Create a named entity recognition system with spaCy',
                        'Analyze sentiment of product reviews',
                    ],
                    details: 'Before deep learning, NLP relied on **feature engineering** from text. TF-IDF and Bag of Words are still useful for baselines. Understanding tokenization is critical — modern LLMs all use **subword tokenization** (BPE, WordPiece).',
                },
                {
                    id: 't-5-2',
                    title: 'Word Embeddings',
                    short: 'Word2Vec, GloVe, FastText — dense vector representations of meaning',
                    difficulty: 'intermediate',
                    hours: 14,
                    xp: 250,
                    prereqs: ['t-5-1', 't-4-1'],
                    concepts: [
                        'Distributed representations vs one-hot encoding',
                        'Word2Vec: Skip-gram & CBOW architectures',
                        'GloVe — Global Vectors for Word Representation',
                        'FastText — subword embeddings',
                        'Embedding arithmetic: king - man + woman = queen',
                        'Visualizing embeddings with t-SNE',
                    ],
                    resources: [
                        { title: 'Word2Vec Paper — Mikolov et al.', url: 'https://arxiv.org/abs/1301.3781', type: 'article' },
                        { title: 'GloVe Project Page', url: 'https://nlp.stanford.edu/projects/glove/', type: 'tool' },
                        { title: 'Stanford CS224n — Word Vectors', url: 'https://web.stanford.edu/class/cs224n/readings/cs224n-2019-notes01-wordvecs1.pdf', type: 'article' },
                        { title: 'Gensim — Topic Modelling for Humans', url: 'https://radimrehurek.com/gensim/', type: 'tool' },
                    ],
                    projects: [
                        'Train Word2Vec on a custom corpus',
                        'Explore embedding analogies and biases',
                        'Build a semantic search engine using embeddings',
                    ],
                    details: 'Word embeddings were a **breakthrough** — representing words as dense vectors where similar words are nearby in vector space. This idea evolved into contextualized embeddings (ELMo, BERT) and now forms the foundation of LLMs.\n\nUnderstanding embeddings is essential for working with any modern NLP system.',
                },
                {
                    id: 't-5-3',
                    title: 'Transformers & Attention',
                    short: 'Self-attention, multi-head attention, positional encoding — the architecture that changed everything',
                    difficulty: 'advanced',
                    hours: 30,
                    xp: 500,
                    prereqs: ['t-5-2', 't-4-4'],
                    concepts: [
                        'Self-attention mechanism — Query, Key, Value',
                        'Scaled dot-product attention',
                        'Multi-head attention — parallel attention streams',
                        'Positional encoding — injecting sequence order',
                        'Encoder-decoder architecture',
                        'Layer normalization & residual connections',
                    ],
                    resources: [
                        { title: 'Attention Is All You Need — Original Paper', url: 'https://arxiv.org/abs/1706.03762', type: 'article' },
                        { title: 'The Illustrated Transformer — Jay Alammar', url: 'https://jalammar.github.io/illustrated-transformer/', type: 'article' },
                        { title: 'Andrej Karpathy — Let\'s build GPT', url: 'https://www.youtube.com/watch?v=kCc8FmEb1nY', type: 'video' },
                        { title: 'Harvard NLP — The Annotated Transformer', url: 'https://nlp.seas.harvard.edu/annotated-transformer/', type: 'article' },
                        { title: 'Hugging Face — Transformers Course', url: 'https://huggingface.co/learn/nlp-course', type: 'course' },
                    ],
                    projects: [
                        'Implement a Transformer from scratch in PyTorch',
                        'Build a small GPT model following Karpathy\'s tutorial',
                        'Fine-tune a pretrained BERT model for text classification',
                    ],
                    details: 'The Transformer architecture is the **most important innovation in modern AI**. It powers GPT, BERT, LLaMA, and virtually every state-of-the-art model. Self-attention allows the model to weigh the importance of every token relative to every other token.\n\n**Karpathy\'s "Let\'s build GPT" is essential viewing** — he builds a GPT from scratch in 2 hours.',
                },
                {
                    id: 't-5-4',
                    title: 'Large Language Models & Fine-tuning',
                    short: 'GPT, BERT, LLaMA, LoRA, RLHF — understanding and adapting foundation models',
                    difficulty: 'advanced',
                    hours: 30,
                    xp: 500,
                    prereqs: ['t-5-3'],
                    concepts: [
                        'Pre-training vs fine-tuning paradigm',
                        'BERT — bidirectional encoder, MLM objective',
                        'GPT family — autoregressive language models',
                        'Parameter-efficient fine-tuning: LoRA, QLoRA, adapters',
                        'RLHF — Reinforcement Learning from Human Feedback',
                        'Prompt engineering & in-context learning',
                    ],
                    resources: [
                        { title: 'Hugging Face — Transformers Library', url: 'https://huggingface.co/docs/transformers/', type: 'docs' },
                        { title: 'LoRA Paper — Hu et al.', url: 'https://arxiv.org/abs/2106.09685', type: 'article' },
                        { title: 'RLHF Explained — Hugging Face Blog', url: 'https://huggingface.co/blog/rlhf', type: 'article' },
                        { title: 'Axolotl — Fine-tuning Framework', url: 'https://github.com/OpenAccess-AI-Collective/axolotl', type: 'tool' },
                        { title: 'LLM Course — Maxime Labonne', url: 'https://github.com/mlabonne/llm-course', type: 'course' },
                    ],
                    projects: [
                        'Fine-tune a LLaMA model with LoRA on custom data',
                        'Build a domain-specific chatbot using fine-tuning',
                        'Implement RLHF on a small language model',
                    ],
                    details: 'LLMs have transformed AI. Understanding how to **fine-tune** pretrained models with LoRA/QLoRA is now a critical skill. RLHF is how models like ChatGPT are aligned with human preferences.\n\nHugging Face\'s ecosystem is the standard for working with LLMs. Start with their tutorials.',
                },
                {
                    id: 't-5-5',
                    title: 'RAG & AI Applications',
                    short: 'Retrieval-augmented generation, vector databases, LangChain — building with LLMs',
                    difficulty: 'advanced',
                    hours: 20,
                    xp: 350,
                    prereqs: ['t-5-4'],
                    concepts: [
                        'Retrieval-Augmented Generation (RAG) architecture',
                        'Vector databases: Pinecone, ChromaDB, Weaviate',
                        'Embedding models for retrieval',
                        'Chunking strategies for documents',
                        'LangChain / LlamaIndex frameworks',
                        'Evaluation: faithfulness, relevance, hallucination detection',
                    ],
                    resources: [
                        { title: 'LangChain Documentation', url: 'https://python.langchain.com/', type: 'docs' },
                        { title: 'LlamaIndex Documentation', url: 'https://docs.llamaindex.ai/', type: 'docs' },
                        { title: 'ChromaDB — Open Source Embedding Database', url: 'https://www.trychroma.com/', type: 'tool' },
                        { title: 'RAG Paper — Lewis et al.', url: 'https://arxiv.org/abs/2005.11401', type: 'article' },
                    ],
                    projects: [
                        'Build a RAG system over your own documents',
                        'Create a "Chat with your PDF" application',
                        'Evaluate RAG quality with RAGAS framework',
                    ],
                    details: 'RAG is the most common pattern for building **practical AI applications**. Instead of fine-tuning (expensive), you retrieve relevant context from a knowledge base and inject it into the LLM prompt. This grounds responses in factual data.\n\nVector databases store embeddings for fast semantic search.',
                },
            ],
        },
        {
            id: 'phase-6',
            title: 'THE SEER',
            subtitle: 'Computer Vision',
            icon: '👁️',
            color: '#8b5cf6',
            topics: [
                {
                    id: 't-6-1',
                    title: 'Image Processing Fundamentals',
                    short: 'Pixels, filters, transformations, OpenCV — working with visual data',
                    difficulty: 'intermediate',
                    hours: 15,
                    xp: 200,
                    prereqs: ['t-2-2', 't-4-3'],
                    concepts: [
                        'Image representation: RGB, grayscale, channels',
                        'Spatial filtering: blur, sharpen, edge detection',
                        'Geometric transforms: rotation, scaling, affine',
                        'Histogram equalization & thresholding',
                        'Morphological operations: erosion, dilation',
                        'OpenCV essentials',
                    ],
                    resources: [
                        { title: 'OpenCV Python Tutorial', url: 'https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html', type: 'docs' },
                        { title: 'PyImageSearch — OpenCV Tutorials', url: 'https://pyimagesearch.com/', type: 'article' },
                        { title: 'Digital Image Processing — Gonzalez & Woods', url: 'https://www.pearson.com/en-us/subject-catalog/p/digital-image-processing/P200000003224', type: 'book' },
                    ],
                    projects: [
                        'Build a real-time face detection system with OpenCV',
                        'Create an image enhancement pipeline',
                        'Implement panorama stitching',
                    ],
                    details: 'Classic image processing techniques are still widely used in production and as preprocessing for deep learning. **OpenCV** is the most popular library for computer vision tasks.\n\nUnderstanding how images work at the pixel level gives you intuition for what CNNs learn.',
                },
                {
                    id: 't-6-2',
                    title: 'Object Detection',
                    short: 'YOLO, Faster R-CNN, anchor boxes — locating objects in images',
                    difficulty: 'advanced',
                    hours: 22,
                    xp: 400,
                    prereqs: ['t-6-1'],
                    concepts: [
                        'Object detection vs classification vs segmentation',
                        'Anchor boxes & region proposals',
                        'Two-stage detectors: Faster R-CNN',
                        'One-stage detectors: YOLO family, SSD',
                        'Non-Maximum Suppression (NMS)',
                        'mAP evaluation metric',
                    ],
                    resources: [
                        { title: 'Ultralytics YOLOv8 Docs', url: 'https://docs.ultralytics.com/', type: 'docs' },
                        { title: 'Detectron2 — Facebook AI', url: 'https://github.com/facebookresearch/detectron2', type: 'tool' },
                        { title: 'CS231n — Detection and Segmentation', url: 'https://cs231n.stanford.edu/', type: 'course' },
                        { title: 'Papers With Code — Object Detection SOTA', url: 'https://paperswithcode.com/task/object-detection', type: 'article' },
                    ],
                    projects: [
                        'Train YOLOv8 on a custom dataset',
                        'Build a real-time object counter for video streams',
                        'Deploy an object detection model as a REST API',
                    ],
                    details: 'Object detection is one of the most **commercially valuable** CV tasks — autonomous driving, surveillance, retail analytics. YOLO is the go-to for real-time detection due to its speed.\n\nYOLOv8 (Ultralytics) is the easiest starting point for practical object detection.',
                },
                {
                    id: 't-6-3',
                    title: 'Image Segmentation',
                    short: 'Semantic, instance & panoptic segmentation — pixel-level understanding',
                    difficulty: 'advanced',
                    hours: 18,
                    xp: 350,
                    prereqs: ['t-6-2'],
                    concepts: [
                        'Semantic segmentation: FCN, U-Net, DeepLab',
                        'Instance segmentation: Mask R-CNN',
                        'Panoptic segmentation — combining both',
                        'Encoder-decoder architecture for dense prediction',
                        'Skip connections & feature pyramid networks',
                        'Segment Anything Model (SAM)',
                    ],
                    resources: [
                        { title: 'U-Net Paper — Ronneberger et al.', url: 'https://arxiv.org/abs/1505.04597', type: 'article' },
                        { title: 'Segment Anything — Meta AI', url: 'https://segment-anything.com/', type: 'tool' },
                        { title: 'torchvision Segmentation Models', url: 'https://pytorch.org/vision/stable/models.html#semantic-segmentation', type: 'docs' },
                    ],
                    projects: [
                        'Build a medical image segmentation model with U-Net',
                        'Train an instance segmentation model for autonomous driving',
                        'Use SAM for zero-shot segmentation on custom images',
                    ],
                    details: 'Segmentation assigns a **class to every pixel**, enabling precise understanding of scene content. U-Net is the workhorse architecture for medical imaging. SAM (Segment Anything) has democratized segmentation with zero-shot capabilities.',
                },
                {
                    id: 't-6-4',
                    title: 'Vision Transformers',
                    short: 'ViT, DINO, CLIP — Transformers meet computer vision',
                    difficulty: 'advanced',
                    hours: 18,
                    xp: 400,
                    prereqs: ['t-5-3', 't-6-1'],
                    concepts: [
                        'Vision Transformer (ViT) — patching images as tokens',
                        'DINO & DINOv2 — self-supervised visual features',
                        'CLIP — connecting vision and language',
                        'Swin Transformer — hierarchical vision',
                        'Image-text contrastive learning',
                        'Zero-shot visual classification',
                    ],
                    resources: [
                        { title: 'ViT Paper — Dosovitskiy et al.', url: 'https://arxiv.org/abs/2010.11929', type: 'article' },
                        { title: 'CLIP Paper — Radford et al.', url: 'https://arxiv.org/abs/2103.00020', type: 'article' },
                        { title: 'DINOv2 — Meta AI', url: 'https://dinov2.metademolab.com/', type: 'tool' },
                        { title: 'Hugging Face — Vision Transformers', url: 'https://huggingface.co/docs/transformers/model_doc/vit', type: 'docs' },
                    ],
                    projects: [
                        'Fine-tune ViT for a custom classification task',
                        'Build an image search engine using CLIP embeddings',
                        'Extract visual features with DINOv2 for downstream tasks',
                    ],
                    details: 'Vision Transformers brought the **attention mechanism** to images by treating image patches as tokens. CLIP connected vision and language, enabling powerful zero-shot capabilities. These models are now state-of-the-art for most vision tasks.',
                },
                {
                    id: 't-6-5',
                    title: 'Generative Vision Models',
                    short: 'GANs, VAEs, diffusion models — creating visual content with AI',
                    difficulty: 'expert',
                    hours: 25,
                    xp: 450,
                    prereqs: ['t-6-4'],
                    concepts: [
                        'Generative Adversarial Networks (GANs) — generator vs discriminator',
                        'Variational Autoencoders (VAEs)',
                        'Diffusion models — denoising process',
                        'Stable Diffusion architecture',
                        'ControlNet & guided generation',
                        'Image-to-image translation: pix2pix, CycleGAN',
                    ],
                    resources: [
                        { title: 'Stable Diffusion — Stability AI', url: 'https://stability.ai/', type: 'tool' },
                        { title: 'Denoising Diffusion Paper — Ho et al.', url: 'https://arxiv.org/abs/2006.11239', type: 'article' },
                        { title: 'The Illustrated Stable Diffusion — Jay Alammar', url: 'https://jalammar.github.io/illustrated-stable-diffusion/', type: 'article' },
                        { title: 'Hugging Face Diffusers', url: 'https://huggingface.co/docs/diffusers/', type: 'docs' },
                    ],
                    projects: [
                        'Train a GAN on a face dataset',
                        'Fine-tune Stable Diffusion with DreamBooth on personal images',
                        'Build an AI art generation tool with ControlNet',
                    ],
                    details: 'Generative models create **new content** — images, video, 3D models. Diffusion models (Stable Diffusion, DALL-E, Midjourney) have become the dominant paradigm, surpassing GANs for image generation quality.\n\nUnderstanding the denoising process is key to working with these models.',
                },
            ],
        },
        {
            id: 'phase-7',
            title: 'THE ARCHITECT',
            subtitle: 'Advanced AI & Research',
            icon: '🔮',
            color: '#ef4444',
            topics: [
                {
                    id: 't-7-1',
                    title: 'Reinforcement Learning',
                    short: 'Agents, rewards, policies, Q-learning, PPO — learning by interaction',
                    difficulty: 'advanced',
                    hours: 25,
                    xp: 400,
                    prereqs: ['t-4-2', 't-1-3'],
                    concepts: [
                        'Markov Decision Processes (MDPs)',
                        'Value functions & Bellman equation',
                        'Q-Learning & Deep Q-Networks (DQN)',
                        'Policy gradient methods',
                        'Proximal Policy Optimization (PPO)',
                        'Actor-Critic methods',
                    ],
                    resources: [
                        { title: 'Spinning Up in Deep RL — OpenAI', url: 'https://spinningup.openai.com/', type: 'course' },
                        { title: 'David Silver — RL Course', url: 'https://www.davidsilver.uk/teaching/', type: 'course' },
                        { title: 'Sutton & Barto — RL: An Introduction', url: 'http://incompleteideas.net/book/the-book.html', type: 'book' },
                        { title: 'Gymnasium (formerly OpenAI Gym)', url: 'https://gymnasium.farama.org/', type: 'tool' },
                    ],
                    projects: [
                        'Train an agent to play CartPole with DQN',
                        'Implement PPO from scratch',
                        'Build an RL agent for a custom environment',
                    ],
                    details: 'RL is how AI systems learn through **trial and error**. It\'s behind AlphaGo, game-playing AIs, and RLHF for language models. PPO is the most widely used algorithm in practice.\n\nOpenAI\'s Spinning Up is the best entry point. Start with CartPole, graduate to more complex environments.',
                },
                {
                    id: 't-7-2',
                    title: 'Graph Neural Networks',
                    short: 'Node embeddings, message passing, GCN, GAT — learning on graph-structured data',
                    difficulty: 'advanced',
                    hours: 18,
                    xp: 350,
                    prereqs: ['t-4-2'],
                    concepts: [
                        'Graph representation: adjacency matrix, edge list',
                        'Message passing neural networks',
                        'Graph Convolutional Networks (GCN)',
                        'Graph Attention Networks (GAT)',
                        'Node classification, link prediction, graph classification',
                        'Molecular property prediction with GNNs',
                    ],
                    resources: [
                        { title: 'Stanford CS224W — Machine Learning with Graphs', url: 'https://web.stanford.edu/class/cs224w/', type: 'course' },
                        { title: 'PyG — PyTorch Geometric', url: 'https://pytorch-geometric.readthedocs.io/', type: 'docs' },
                        { title: 'Distill — A Gentle Introduction to GNNs', url: 'https://distill.pub/2021/gnn-intro/', type: 'article' },
                    ],
                    projects: [
                        'Predict molecular properties using GCN',
                        'Build a social network recommendation system',
                        'Implement a knowledge graph completion model',
                    ],
                    details: 'Many real-world problems involve **graph-structured data** — social networks, molecules, knowledge graphs, traffic networks. GNNs extend deep learning to these non-Euclidean domains.\n\nCS224W is the definitive course. PyTorch Geometric is the standard library.',
                },
                {
                    id: 't-7-3',
                    title: 'Multi-Modal AI',
                    short: 'Vision-language models, audio, cross-modal learning — combining modalities',
                    difficulty: 'expert',
                    hours: 22,
                    xp: 450,
                    prereqs: ['t-5-4', 't-6-4'],
                    concepts: [
                        'Multi-modal fusion strategies: early, late, cross-attention',
                        'Vision-Language Models: GPT-4V, LLaVA, Gemini',
                        'Image captioning & visual question answering',
                        'Audio processing: speech-to-text, Whisper',
                        'CLIP-based architectures for cross-modal retrieval',
                        'Multi-modal embeddings & shared representation spaces',
                    ],
                    resources: [
                        { title: 'LLaVA — Large Language and Vision Assistant', url: 'https://llava-vl.github.io/', type: 'article' },
                        { title: 'Whisper — OpenAI Speech Recognition', url: 'https://github.com/openai/whisper', type: 'tool' },
                        { title: 'Hugging Face — Multi-Modal Models', url: 'https://huggingface.co/docs/transformers/model_doc/llava', type: 'docs' },
                        { title: 'Flamingo Paper — Alayrac et al.', url: 'https://arxiv.org/abs/2204.14198', type: 'article' },
                    ],
                    projects: [
                        'Build a visual question answering system',
                        'Create a multi-modal search engine (text ↔ image)',
                        'Build a speech-to-summary pipeline with Whisper + LLM',
                    ],
                    details: 'The future of AI is **multi-modal** — models that seamlessly understand text, images, audio, and video together. GPT-4V and Gemini demonstrate this. Learning to combine modalities is an increasingly valuable skill.',
                },
                {
                    id: 't-7-4',
                    title: 'AI Agents & Tool Use',
                    short: 'Autonomous agents, function calling, planning, memory — AI that takes action',
                    difficulty: 'expert',
                    hours: 20,
                    xp: 400,
                    prereqs: ['t-5-5'],
                    concepts: [
                        'LLM-powered autonomous agents',
                        'Function calling & tool use',
                        'Planning: ReAct, Chain-of-Thought, Tree-of-Thought',
                        'Memory systems: short-term, long-term, episodic',
                        'Agent frameworks: AutoGPT, CrewAI, LangGraph',
                        'Safety & guardrails for autonomous systems',
                    ],
                    resources: [
                        { title: 'LangGraph — Agent Framework', url: 'https://python.langchain.com/docs/langgraph', type: 'docs' },
                        { title: 'CrewAI — Multi-Agent Framework', url: 'https://github.com/joaomdmoura/crewAI', type: 'tool' },
                        { title: 'ReAct Paper — Yao et al.', url: 'https://arxiv.org/abs/2210.03629', type: 'article' },
                        { title: 'Lilian Weng — LLM Powered Autonomous Agents', url: 'https://lilianweng.github.io/posts/2023-06-23-agent/', type: 'article' },
                    ],
                    projects: [
                        'Build a research agent that searches, reads, and summarizes papers',
                        'Create a code generation agent with self-debugging',
                        'Build a multi-agent system for complex task decomposition',
                    ],
                    details: 'AI agents represent the next frontier — LLMs that can **take actions**, use tools, and complete complex multi-step tasks autonomously. This is one of the hottest areas in AI right now.\n\nLilian Weng\'s blog post is the definitive overview. LangGraph is the standard for building agents.',
                },
                {
                    id: 't-7-5',
                    title: 'Research Paper Reading & Reproduction',
                    short: 'arXiv, paper analysis, implementation — staying at the cutting edge',
                    difficulty: 'expert',
                    hours: 30,
                    xp: 500,
                    prereqs: ['t-5-3', 't-4-2'],
                    concepts: [
                        'How to read ML research papers efficiently',
                        'Understanding ablation studies & experimental design',
                        'Reproducing results from papers',
                        'arXiv, Papers With Code, Semantic Scholar',
                        'Writing experiment logs & research notes',
                        'Contributing to open-source ML projects',
                    ],
                    resources: [
                        { title: 'How to Read a Paper — S. Keshav', url: 'http://ccr.sigcomm.org/online/files/p83-keshavA.pdf', type: 'article' },
                        { title: 'Papers With Code', url: 'https://paperswithcode.com/', type: 'tool' },
                        { title: 'Yannic Kilcher — ML Paper Explanations', url: 'https://www.youtube.com/c/YannicKilcher', type: 'video' },
                        { title: 'arXiv — Machine Learning', url: 'https://arxiv.org/list/cs.LG/recent', type: 'tool' },
                        { title: 'Weights & Biases — Experiment Tracking', url: 'https://wandb.ai/', type: 'tool' },
                    ],
                    projects: [
                        'Read and summarize 5 landmark papers in your focus area',
                        'Reproduce results from a recent paper with available code',
                        'Implement a paper from scratch and write up findings',
                    ],
                    details: 'To be a **master AI developer**, you need to stay current with research. The field moves fast — new architectures and techniques appear weekly. Learning to read papers efficiently is a superpower.\n\nStart with Yannic Kilcher\'s video explanations, then read the original papers.',
                },
            ],
        },
        {
            id: 'phase-8',
            title: 'THE ENGINEER',
            subtitle: 'MLOps & Production',
            icon: '🏗️',
            color: '#14b8a6',
            topics: [
                {
                    id: 't-8-1',
                    title: 'Model Deployment & Serving',
                    short: 'FastAPI, TorchServe, ONNX, model optimization — putting models into production',
                    difficulty: 'intermediate',
                    hours: 20,
                    xp: 300,
                    prereqs: ['t-4-2'],
                    concepts: [
                        'REST API with FastAPI for model serving',
                        'Model serialization: pickle, ONNX, TorchScript',
                        'Batching & async inference',
                        'Model optimization: quantization, pruning, distillation',
                        'TorchServe & TensorFlow Serving',
                        'Edge deployment: TFLite, ONNX Runtime',
                    ],
                    resources: [
                        { title: 'FastAPI Documentation', url: 'https://fastapi.tiangolo.com/', type: 'docs' },
                        { title: 'ONNX Runtime', url: 'https://onnxruntime.ai/', type: 'docs' },
                        { title: 'TorchServe — PyTorch Model Serving', url: 'https://pytorch.org/serve/', type: 'docs' },
                        { title: 'Made With ML — MLOps Course', url: 'https://madewithml.com/', type: 'course' },
                    ],
                    projects: [
                        'Deploy an image classification model with FastAPI',
                        'Convert a PyTorch model to ONNX and benchmark speed',
                        'Build a low-latency inference service with batching',
                    ],
                    details: 'A model that can\'t be deployed is just a **science project**. Learn to serve models via APIs, optimize them for speed and memory, and handle production concerns like latency and throughput.\n\nFastAPI + ONNX Runtime is a powerful, lightweight combination for model serving.',
                },
                {
                    id: 't-8-2',
                    title: 'Docker & Containerization for ML',
                    short: 'Containers, images, Docker Compose — reproducible ML environments',
                    difficulty: 'intermediate',
                    hours: 12,
                    xp: 200,
                    prereqs: ['t-8-1'],
                    concepts: [
                        'Docker basics: images, containers, Dockerfile',
                        'Multi-stage builds for smaller images',
                        'Docker Compose for multi-service setups',
                        'GPU passthrough with NVIDIA Container Toolkit',
                        'Container registries: Docker Hub, ECR, GCR',
                        'Best practices for ML Docker images',
                    ],
                    resources: [
                        { title: 'Docker Official Getting Started', url: 'https://docs.docker.com/get-started/', type: 'docs' },
                        { title: 'NVIDIA Container Toolkit', url: 'https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/', type: 'docs' },
                        { title: 'Full Stack Deep Learning — Infrastructure', url: 'https://fullstackdeeplearning.com/', type: 'course' },
                    ],
                    projects: [
                        'Containerize an ML training pipeline',
                        'Create a Docker Compose setup with model server + frontend',
                        'Set up GPU-accelerated containers for training',
                    ],
                    details: 'Docker ensures your ML code runs the **same everywhere** — your laptop, CI/CD, production servers. It solves the "works on my machine" problem that plagues ML projects.\n\nLearn multi-stage builds to keep images small, and GPU passthrough for training.',
                },
                {
                    id: 't-8-3',
                    title: 'ML Pipelines & Orchestration',
                    short: 'MLflow, Airflow, DVC, experiment tracking — systematic ML development',
                    difficulty: 'advanced',
                    hours: 18,
                    xp: 300,
                    prereqs: ['t-8-2'],
                    concepts: [
                        'Experiment tracking: MLflow, Weights & Biases',
                        'Data versioning with DVC',
                        'Pipeline orchestration: Airflow, Prefect, Kubeflow',
                        'Feature stores: Feast',
                        'Model registry & versioning',
                        'CI/CD for ML models',
                    ],
                    resources: [
                        { title: 'MLflow Documentation', url: 'https://mlflow.org/docs/latest/', type: 'docs' },
                        { title: 'Weights & Biases — Experiment Tracking', url: 'https://wandb.ai/', type: 'tool' },
                        { title: 'DVC — Data Version Control', url: 'https://dvc.org/', type: 'tool' },
                        { title: 'Prefect — Workflow Orchestration', url: 'https://www.prefect.io/', type: 'tool' },
                    ],
                    projects: [
                        'Set up MLflow tracking for all experiments',
                        'Build an automated retraining pipeline with Prefect',
                        'Create a model registry with promotion stages (dev→staging→prod)',
                    ],
                    details: 'Professional ML requires **systematic experiment management**. Without tracking, you lose reproducibility. MLflow and W&B track parameters, metrics, and artifacts. DVC versions datasets alongside code.\n\nThese tools separate hobbyists from professionals.',
                },
                {
                    id: 't-8-4',
                    title: 'Model Monitoring & Drift Detection',
                    short: 'Data drift, concept drift, observability — keeping models healthy in production',
                    difficulty: 'advanced',
                    hours: 14,
                    xp: 250,
                    prereqs: ['t-8-3'],
                    concepts: [
                        'Data drift — when input distribution changes',
                        'Concept drift — when the relationship changes',
                        'Monitoring metrics: latency, throughput, error rates',
                        'Statistical tests for drift: KS, PSI, Chi-squared',
                        'Alerting & automated retraining triggers',
                        'Tools: Evidently AI, WhyLabs, Arize',
                    ],
                    resources: [
                        { title: 'Evidently AI — ML Monitoring', url: 'https://www.evidentlyai.com/', type: 'tool' },
                        { title: 'Made With ML — Monitoring Section', url: 'https://madewithml.com/', type: 'course' },
                        { title: 'Google — ML Best Practices', url: 'https://developers.google.com/machine-learning/guides/rules-of-ml', type: 'article' },
                    ],
                    projects: [
                        'Set up drift detection for a deployed model',
                        'Build a monitoring dashboard with Evidently',
                        'Implement automated retraining when drift exceeds threshold',
                    ],
                    details: 'Models **degrade over time** as the world changes. Without monitoring, you won\'t know until customers complain. Drift detection catches problems early and triggers retraining.\n\nGoogle\'s Rules of ML is required reading for understanding production ML challenges.',
                },
                {
                    id: 't-8-5',
                    title: 'Cloud ML Platforms',
                    short: 'AWS SageMaker, GCP Vertex AI, Azure ML — training and deploying at scale',
                    difficulty: 'advanced',
                    hours: 20,
                    xp: 350,
                    prereqs: ['t-8-3'],
                    concepts: [
                        'AWS SageMaker: training, endpoints, pipelines',
                        'GCP Vertex AI: AutoML, custom training, prediction',
                        'Distributed training: data parallelism, model parallelism',
                        'Spot/preemptible instances for cost optimization',
                        'GPU selection: A100, H100, T4 — cost vs performance',
                        'Serverless inference: Lambda, Cloud Functions',
                    ],
                    resources: [
                        { title: 'AWS SageMaker Developer Guide', url: 'https://docs.aws.amazon.com/sagemaker/', type: 'docs' },
                        { title: 'Google Cloud Vertex AI', url: 'https://cloud.google.com/vertex-ai/docs', type: 'docs' },
                        { title: 'Azure Machine Learning', url: 'https://learn.microsoft.com/en-us/azure/machine-learning/', type: 'docs' },
                        { title: 'Lambda Cloud — GPU Instances', url: 'https://lambdalabs.com/service/gpu-cloud', type: 'tool' },
                    ],
                    projects: [
                        'Train a model on SageMaker with spot instances',
                        'Deploy a model endpoint on Vertex AI',
                        'Set up distributed training across multiple GPUs',
                    ],
                    details: 'Real-world ML often requires **more compute** than a single machine provides. Cloud platforms offer managed training, deployment, and scaling. Understanding costs and GPU selection is essential for budgeting.\n\nPick one cloud platform to go deep on — the concepts transfer across providers.',
                },
            ],
        },
        {
            id: 'phase-9',
            title: 'THE GRANDMASTER',
            subtitle: 'Mastery & Impact',
            icon: '👑',
            color: '#f97316',
            topics: [
                {
                    id: 't-9-1',
                    title: 'End-to-End AI Product Development',
                    short: 'Problem framing, data strategy, iteration, stakeholder management — building real AI products',
                    difficulty: 'expert',
                    hours: 30,
                    xp: 500,
                    prereqs: ['t-8-3', 't-5-5'],
                    concepts: [
                        'Problem framing — is ML the right solution?',
                        'Data strategy: collection, labeling, augmentation',
                        'MVP approach — simple baselines first',
                        'A/B testing & gradual rollout',
                        'Stakeholder communication — explaining ML to non-technical people',
                        'Ethical considerations & bias detection',
                    ],
                    resources: [
                        { title: 'Designing Machine Learning Systems — Chip Huyen', url: 'https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/', type: 'book' },
                        { title: 'Google — People + AI Guidebook', url: 'https://pair.withgoogle.com/', type: 'article' },
                        { title: 'Full Stack Deep Learning', url: 'https://fullstackdeeplearning.com/', type: 'course' },
                    ],
                    projects: [
                        'Build an end-to-end AI product from problem to deployment',
                        'Create a data labeling pipeline for a new domain',
                        'Write a technical design document for an ML system',
                    ],
                    details: 'Being a master AI developer means knowing **when and how** to apply ML in the real world. Most ML projects fail not because of bad models, but because of bad problem framing, poor data, or misaligned incentives.\n\nChip Huyen\'s book is the definitive guide to ML systems design.',
                },
                {
                    id: 't-9-2',
                    title: 'AI Ethics & Safety',
                    short: 'Bias, fairness, alignment, interpretability — responsible AI development',
                    difficulty: 'expert',
                    hours: 15,
                    xp: 300,
                    prereqs: ['t-5-4'],
                    concepts: [
                        'Algorithmic bias: sources and mitigation',
                        'Fairness metrics: demographic parity, equalized odds',
                        'AI alignment — ensuring AI systems do what we want',
                        'Interpretability vs explainability',
                        'Responsible AI frameworks & governance',
                        'Environmental impact of training large models',
                    ],
                    resources: [
                        { title: 'Fairlearn — Fairness in ML', url: 'https://fairlearn.org/', type: 'tool' },
                        { title: 'AI Safety Fundamentals', url: 'https://aisafetyfundamentals.com/', type: 'course' },
                        { title: 'Anthropic — Core Views on AI Safety', url: 'https://www.anthropic.com/research', type: 'article' },
                        { title: 'Model Cards — Mitchell et al.', url: 'https://arxiv.org/abs/1810.03993', type: 'article' },
                    ],
                    projects: [
                        'Audit a model for demographic bias',
                        'Implement fairness constraints in a hiring model',
                        'Write a model card for a deployed system',
                    ],
                    details: 'AI systems have **real-world consequences**. Biased models can discriminate, unsafe systems can cause harm. Understanding ethics and safety is not optional — it\'s a core competency for any responsible AI developer.',
                },
                {
                    id: 't-9-3',
                    title: 'Kaggle & Competitive ML',
                    short: 'Competition strategy, feature engineering, winning solutions — sharpening your skills',
                    difficulty: 'advanced',
                    hours: 40,
                    xp: 500,
                    prereqs: ['t-3-5', 't-4-2'],
                    concepts: [
                        'Competition strategy: EDA → baseline → iterate',
                        'Advanced feature engineering techniques',
                        'Ensemble strategies for competitions',
                        'Post-processing & threshold optimization',
                        'Learning from winning solutions',
                        'Building a Kaggle portfolio',
                    ],
                    resources: [
                        { title: 'Kaggle — Competitions', url: 'https://www.kaggle.com/competitions', type: 'tool' },
                        { title: 'Kaggle Winners\' Blog Posts', url: 'https://www.kaggle.com/code', type: 'article' },
                        { title: 'Abhishek Thakur — Approaching (Almost) Any ML Problem', url: 'https://github.com/abhishekkrthakur/approachingalmost', type: 'book' },
                    ],
                    projects: [
                        'Complete 5 Kaggle competitions (aim for top 20%)',
                        'Achieve Kaggle Expert or higher rank',
                        'Study and reproduce 3 winning solutions',
                    ],
                    details: 'Kaggle competitions are the **gym for ML skills**. They force you to work with real data, iterate quickly, and learn from the best practitioners in the world.\n\nStudying winning solutions teaches you tricks that no course covers.',
                },
                {
                    id: 't-9-4',
                    title: 'Open Source Contribution',
                    short: 'Contributing to ML frameworks, building tools, community engagement — giving back',
                    difficulty: 'expert',
                    hours: 30,
                    xp: 450,
                    prereqs: ['t-7-5'],
                    concepts: [
                        'Finding good first issues in ML repos',
                        'Code review & PR best practices',
                        'Writing documentation & tutorials',
                        'Building and maintaining an ML library',
                        'Community engagement: Discord, forums, conferences',
                        'Technical blogging & knowledge sharing',
                    ],
                    resources: [
                        { title: 'Hugging Face — Contributing Guide', url: 'https://github.com/huggingface/transformers/blob/main/CONTRIBUTING.md', type: 'docs' },
                        { title: 'PyTorch Contributing Guide', url: 'https://github.com/pytorch/pytorch/blob/main/CONTRIBUTING.md', type: 'docs' },
                        { title: 'How to Contribute to Open Source — GitHub', url: 'https://opensource.guide/how-to-contribute/', type: 'article' },
                    ],
                    projects: [
                        'Submit a PR to a major ML library (PyTorch, HF, scikit-learn)',
                        'Create and publish your own ML utility package',
                        'Write 5 technical blog posts about ML topics you\'ve mastered',
                    ],
                    details: 'Contributing to open source **accelerates your growth** exponentially. You learn from world-class engineers, build reputation, and give back to the community that built the tools you use.\n\nStart with documentation and bug fixes, then work up to features.',
                },
                {
                    id: 't-9-5',
                    title: 'Building Your AI Portfolio & Career',
                    short: 'Projects, papers, networking, interviews — becoming a recognized AI professional',
                    difficulty: 'expert',
                    hours: 25,
                    xp: 500,
                    prereqs: ['t-9-1'],
                    concepts: [
                        'Building a standout GitHub portfolio',
                        'ML system design interviews',
                        'Networking: conferences, meetups, Twitter/X',
                        'Publishing research or technical reports',
                        'Specialization vs generalization strategy',
                        'Staying current: newsletters, papers, communities',
                    ],
                    resources: [
                        { title: 'ML System Design Interview — Alex Xu', url: 'https://www.amazon.com/Machine-Learning-System-Design-Interview/dp/1736049127', type: 'book' },
                        { title: 'The Batch — Andrew Ng\'s Newsletter', url: 'https://www.deeplearning.ai/the-batch/', type: 'article' },
                        { title: 'NeurIPS, ICML, ICLR — Top AI Conferences', url: 'https://neurips.cc/', type: 'tool' },
                        { title: 'Hugging Face Community', url: 'https://huggingface.co/', type: 'tool' },
                    ],
                    projects: [
                        'Build 3 impressive end-to-end AI projects for your portfolio',
                        'Write a technical blog explaining a complex ML concept',
                        'Prepare and practice ML system design questions',
                    ],
                    details: 'Your portfolio is your **proof of mastery**. Build end-to-end projects that demonstrate full-stack AI capability. Write about what you learn. Network with the community.\n\nThe AI field rewards those who **build in public** and share their knowledge.',
                },
            ],
        },
    ];

    // ========================================================================
    //  STATE
    // ========================================================================

    const STORAGE_KEY = 'skilltree2:state';
    let state = {
        topicStatus: {},
        notes: {},
        activePhase: null,
        filter: 'all',
        searchQuery: '',
    };

    function allTopics() {
        const out = [];
        ROADMAP.forEach((phase) => phase.topics.forEach((t) => out.push({ ...t, phase })));
        return out;
    }

    function totalCounts() {
        const topics = allTopics();
        let completed = 0, inProgress = 0, totalXP = 0, earnedXP = 0, totalHours = 0;
        topics.forEach((t) => {
            totalXP += t.xp;
            totalHours += t.hours;
            const s = state.topicStatus[t.id];
            if (s === 'completed') { completed++; earnedXP += t.xp; }
            else if (s === 'in-progress') { inProgress++; }
        });
        return { total: topics.length, completed, inProgress, totalXP, earnedXP, totalHours, pct: topics.length ? Math.round((completed / topics.length) * 100) : 0 };
    }

    function phaseCounts(phase) {
        let completed = 0;
        phase.topics.forEach((t) => { if (state.topicStatus[t.id] === 'completed') completed++; });
        return { total: phase.topics.length, completed, pct: phase.topics.length ? Math.round((completed / phase.topics.length) * 100) : 0 };
    }

    // ========================================================================
    //  PERSISTENCE  (MongoDB via API, localStorage fallback)
    // ========================================================================

    const API_ENDPOINT = '/api/skilltree2-progress';
    let _saveTimer = null;

    function saveLocal() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                topicStatus: state.topicStatus,
                notes: state.notes,
                savedAt: new Date().toISOString(),
            }));
        } catch (_) { /* ignore */ }
    }

    function loadLocal() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.topicStatus) state.topicStatus = data.topicStatus;
            if (data.notes) state.notes = data.notes;
        } catch (_) { /* ignore */ }
    }

    function save() {
        saveLocal();
        clearTimeout(_saveTimer);
        _saveTimer = setTimeout(saveToServer, 500);
    }

    async function saveToServer() {
        try {
            const res = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                body: JSON.stringify({
                    topicStatus: state.topicStatus,
                    notes: state.notes,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const el = document.getElementById('last-saved');
                if (el) el.textContent = 'Synced ' + new Date().toLocaleTimeString();
            } else {
                console.warn('Server save failed, localStorage only');
                const el = document.getElementById('last-saved');
                if (el) el.textContent = 'Offline — saved locally';
            }
        } catch (e) {
            console.warn('Server save failed:', e);
            const el = document.getElementById('last-saved');
            if (el) el.textContent = 'Offline — saved locally';
        }
    }

    async function load() {
        loadLocal();
        try {
            const res = await fetch(API_ENDPOINT, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data && data.topicStatus && Object.keys(data.topicStatus).length > 0) {
                    state.topicStatus = data.topicStatus;
                    if (data.notes) state.notes = data.notes;
                    saveLocal();
                } else if (Object.keys(state.topicStatus).length > 0) {
                    saveToServer();
                }
                const el = document.getElementById('last-saved');
                if (el) el.textContent = 'Synced with cloud';
            }
        } catch (e) {
            console.warn('Server load failed, using localStorage:', e);
            const el = document.getElementById('last-saved');
            if (el) el.textContent = 'Offline — using local data';
        }
    }

    // ========================================================================
    //  DOM HELPERS
    // ========================================================================

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    function el(tag, attrs, ...children) {
        const e = document.createElement(tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => {
            if (k === 'className') e.className = v;
            else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
            else if (k === 'html') e.innerHTML = v;
            else e.setAttribute(k, v);
        });
        children.flat().forEach((c) => {
            if (c == null) return;
            e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
        return e;
    }

    function showToast(icon, msg) {
        const toast = $('#toast');
        $('#toast-icon').textContent = icon;
        $('#toast-msg').textContent = msg;
        toast.hidden = false;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => { toast.hidden = true; }, 2500);
    }

    // ========================================================================
    //  RENDERING
    // ========================================================================

    function render() {
        renderStats();
        renderPhaseNav();
        renderMain();
    }

    function renderStats() {
        const c = totalCounts();
        $('#completed-count').textContent = c.completed;
        $('#total-count').textContent = c.total;
        $('#total-hours').textContent = c.totalHours;
        $('#total-xp').textContent = c.earnedXP;
        $('#global-pct').textContent = c.pct + '%';
        $('#global-fill').style.width = c.pct + '%';
    }

    function renderPhaseNav() {
        const nav = $('#phase-nav');
        nav.innerHTML = '';
        const allChip = el('button', {
            className: 'phase-chip' + (state.activePhase === null ? ' active' : ''),
            onClick: () => { state.activePhase = null; render(); },
        }, el('span', { className: 'chip-icon' }, '🗺️'), 'All Phases');
        nav.appendChild(allChip);
        ROADMAP.forEach((phase) => {
            const pc = phaseCounts(phase);
            const chip = el('button', {
                className: 'phase-chip' + (state.activePhase === phase.id ? ' active' : ''),
                onClick: () => { state.activePhase = phase.id; render(); scrollToPhase(phase.id); },
            },
                el('span', { className: 'chip-icon' }, phase.icon),
                phase.title,
                el('span', { className: 'chip-pct' }, pc.pct + '%'),
            );
            nav.appendChild(chip);
        });
    }

    function scrollToPhase(id) {
        setTimeout(() => {
            const section = document.getElementById(id);
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }

    function renderMain() {
        const main = $('#main-content');
        main.innerHTML = '';
        const phases = state.activePhase ? ROADMAP.filter((p) => p.id === state.activePhase) : ROADMAP;
        phases.forEach((phase) => {
            const section = renderPhaseSection(phase);
            main.appendChild(section);
        });
    }

    function renderPhaseSection(phase) {
        const pc = phaseCounts(phase);
        const circumference = 2 * Math.PI * 22;
        const dashoffset = circumference - (pc.pct / 100) * circumference;

        const section = el('div', { className: 'phase-section', id: phase.id });
        section.style.setProperty('--phase-color', phase.color);

        const header = el('div', { className: 'phase-header' },
            el('div', { className: 'phase-icon' }, phase.icon),
            el('div', { className: 'phase-text' },
                el('div', { className: 'phase-title' }, phase.title),
                el('div', { className: 'phase-subtitle' }, phase.subtitle + ' — ' + pc.completed + '/' + pc.total + ' completed'),
            ),
            el('div', { className: 'phase-progress-ring', html: `
                <svg width="56" height="56"><circle class="ring-bg" cx="28" cy="28" r="22"/><circle class="ring-val" cx="28" cy="28" r="22" stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}"/></svg>
                <span class="ring-text">${pc.pct}%</span>
            ` }),
        );
        section.appendChild(header);

        const grid = el('div', { className: 'topics-grid' });
        phase.topics.forEach((topic, idx) => {
            const card = renderTopicCard(topic, phase, idx);
            grid.appendChild(card);
        });
        section.appendChild(grid);
        return section;
    }

    function renderTopicCard(topic, phase, idx) {
        const status = state.topicStatus[topic.id] || 'not-started';
        const matchesFilter = state.filter === 'all' || state.filter === status;
        const matchesSearch = !state.searchQuery || matchesSearchQuery(topic);
        const hidden = !matchesFilter || !matchesSearch;

        const card = el('div', {
            className: 'topic-card status-' + status + (hidden ? ' hidden' : ''),
            tabindex: '0',
            onClick: () => openPanel(topic, phase),
            onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(topic, phase); } },
        },
            el('div', { className: 'topic-status-dot' }),
            el('div', { className: 'topic-body' },
                el('div', { className: 'topic-title' },
                    el('span', { className: 'topic-number' }, String(idx + 1).padStart(2, '0')),
                    topic.title,
                ),
                el('div', { className: 'topic-short' }, topic.short),
                el('div', { className: 'topic-meta' },
                    el('span', null, el('span', { className: 'diff-badge diff-' + topic.difficulty }, topic.difficulty)),
                    el('span', { html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ~${topic.hours}h` }),
                    el('span', { html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${topic.xp} XP` }),
                ),
            ),
        );
        return card;
    }

    function matchesSearchQuery(topic) {
        const q = state.searchQuery.toLowerCase();
        if (topic.title.toLowerCase().includes(q)) return true;
        if (topic.short.toLowerCase().includes(q)) return true;
        if (topic.details.toLowerCase().includes(q)) return true;
        if (topic.concepts.some((c) => c.toLowerCase().includes(q))) return true;
        if (topic.resources.some((r) => r.title.toLowerCase().includes(q))) return true;
        return false;
    }

    // ========================================================================
    //  PANEL
    // ========================================================================

    function openPanel(topic, phase) {
        const panel = $('#topic-panel');
        panel.hidden = false;
        document.body.style.overflow = 'hidden';

        $('#panel-phase').textContent = phase.icon + ' ' + phase.title;
        $('#panel-title').textContent = topic.title;

        const body = $('#panel-body');
        body.innerHTML = '';

        const status = state.topicStatus[topic.id] || 'not-started';

        // Meta
        const meta = el('div', { className: 'panel-meta-grid' },
            el('div', { className: 'panel-meta-chip', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ~${topic.hours} hours` }),
            el('div', { className: 'panel-meta-chip', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${topic.xp} XP` }),
            el('div', { className: 'panel-meta-chip' }, el('span', { className: 'diff-badge diff-' + topic.difficulty }, topic.difficulty)),
        );
        body.appendChild(meta);

        // Prerequisites
        if (topic.prereqs.length > 0) {
            const prereqSection = el('div', { className: 'panel-section' },
                el('div', { className: 'panel-section-title', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg> Prerequisites' }),
            );
            const tags = el('div', { className: 'prereq-tags' });
            topic.prereqs.forEach((pid) => {
                const pt = allTopics().find((t) => t.id === pid);
                const done = state.topicStatus[pid] === 'completed';
                tags.appendChild(el('span', { className: 'prereq-tag' + (done ? ' done' : '') }, pt ? pt.title : pid));
            });
            prereqSection.appendChild(tags);
            body.appendChild(prereqSection);
        }

        // Description
        const descSection = el('div', { className: 'panel-section' },
            el('div', { className: 'panel-section-title', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Description' }),
            el('div', { className: 'panel-description', html: formatText(topic.details) }),
        );
        body.appendChild(descSection);

        // Key Concepts
        const conceptSection = el('div', { className: 'panel-section' },
            el('div', { className: 'panel-section-title', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Key Concepts' }),
        );
        const ul = el('ul', { className: 'concept-list' });
        topic.concepts.forEach((c) => ul.appendChild(el('li', null, c)));
        conceptSection.appendChild(ul);
        body.appendChild(conceptSection);

        // Resources
        const resSection = el('div', { className: 'panel-section' },
            el('div', { className: 'panel-section-title', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> Suggested Resources' }),
        );
        const resList = el('ul', { className: 'resource-list' });
        topic.resources.forEach((r) => {
            const item = el('div', { className: 'resource-item' },
                el('span', { className: 'resource-type-badge type-' + r.type }, r.type),
                el('div', { className: 'resource-info' },
                    el('div', { className: 'resource-title' }, el('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.title)),
                ),
            );
            resList.appendChild(item);
        });
        resSection.appendChild(resList);
        body.appendChild(resSection);

        // Projects
        if (topic.projects.length > 0) {
            const projSection = el('div', { className: 'panel-section' },
                el('div', { className: 'panel-section-title', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Suggested Projects' }),
            );
            const projList = el('ul', { className: 'project-list' });
            topic.projects.forEach((p) => projList.appendChild(el('li', null, p)));
            projSection.appendChild(projList);
            body.appendChild(projSection);
        }

        // Notes
        const notesSection = el('div', { className: 'panel-section panel-notes' },
            el('div', { className: 'panel-section-title', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Your Notes' }),
        );
        const textarea = el('textarea', {
            placeholder: 'Add personal notes about this topic...',
        });
        textarea.value = state.notes[topic.id] || '';
        textarea.addEventListener('input', () => { state.notes[topic.id] = textarea.value; save(); });
        notesSection.appendChild(textarea);
        body.appendChild(notesSection);

        // Footer buttons
        const footer = $('#panel-footer');
        footer.innerHTML = '';
        if (status === 'not-started') {
            footer.appendChild(el('button', { className: 'btn warning', onClick: () => setStatus(topic.id, 'in-progress') },
                el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>' }), 'Start Learning'));
            footer.appendChild(el('button', { className: 'btn success', onClick: () => setStatus(topic.id, 'completed') },
                el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' }), 'Mark Complete'));
        } else if (status === 'in-progress') {
            footer.appendChild(el('button', { className: 'btn secondary', onClick: () => setStatus(topic.id, 'not-started') }, 'Reset'));
            footer.appendChild(el('button', { className: 'btn success', onClick: () => setStatus(topic.id, 'completed') },
                el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' }), 'Mark Complete'));
        } else {
            footer.appendChild(el('button', { className: 'btn secondary', onClick: () => setStatus(topic.id, 'not-started') }, 'Reset'));
            footer.appendChild(el('button', { className: 'btn completed-btn', disabled: 'true' }, '✓ Completed'));
        }
    }

    function closePanel() {
        $('#topic-panel').hidden = true;
        document.body.style.overflow = '';
    }

    function setStatus(topicId, status) {
        state.topicStatus[topicId] = status;
        save();
        render();
        const topic = allTopics().find((t) => t.id === topicId);
        if (status === 'completed') showToast('🎉', (topic ? topic.title : 'Topic') + ' completed! +' + (topic ? topic.xp : 0) + ' XP');
        else if (status === 'in-progress') showToast('🚀', 'Started: ' + (topic ? topic.title : 'Topic'));
        else showToast('↩️', 'Reset: ' + (topic ? topic.title : 'Topic'));

        if ($('#topic-panel').hidden === false && topic) {
            const phase = ROADMAP.find((p) => p.topics.some((t) => t.id === topicId));
            if (phase) openPanel(topic, phase);
        }
    }

    function formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    // ========================================================================
    //  EXPORT / IMPORT
    // ========================================================================

    function exportProgress() {
        const data = {
            app: 'skilltree2',
            version: '1.0',
            exportedAt: new Date().toISOString(),
            topicStatus: state.topicStatus,
            notes: state.notes,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `skilltree2-progress-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('📦', 'Progress exported!');
    }

    function importProgress(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.topicStatus) state.topicStatus = data.topicStatus;
                if (data.notes) state.notes = data.notes;
                save();
                render();
                closeImportModal();
                showToast('📥', 'Progress imported!');
            } catch (err) {
                showToast('❌', 'Invalid file format');
            }
        };
        reader.readAsText(file);
    }

    function openImportModal() { $('#import-modal').hidden = false; }
    function closeImportModal() { $('#import-modal').hidden = true; }

    // ========================================================================
    //  EVENT BINDING
    // ========================================================================

    function bindEvents() {
        // Panel close
        $('#panel-close').addEventListener('click', closePanel);
        $('#panel-backdrop').addEventListener('click', closePanel);

        // Search toggle
        $('#search-toggle-btn').addEventListener('click', () => {
            const bar = $('#search-bar');
            bar.hidden = !bar.hidden;
            if (!bar.hidden) $('#search-input').focus();
        });

        // Search input
        let searchTimer;
        $('#search-input').addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                state.searchQuery = e.target.value.trim();
                renderMain();
            }, 200);
        });

        // Filter pills
        $$('.pill[data-filter]').forEach((pill) => {
            pill.addEventListener('click', () => {
                $$('.pill[data-filter]').forEach((p) => p.classList.remove('active'));
                pill.classList.add('active');
                state.filter = pill.dataset.filter;
                renderMain();
            });
        });

        // Export
        $('#export-btn').addEventListener('click', exportProgress);

        // Import
        $('#import-btn').addEventListener('click', openImportModal);
        $('#import-cancel').addEventListener('click', closeImportModal);
        $('#import-modal-backdrop').addEventListener('click', closeImportModal);
        const fileInput = $('#import-file');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) importProgress(e.target.files[0]);
            });
        }

        // Reset
        $('#reset-btn').addEventListener('click', () => {
            if (confirm('Reset ALL progress? This cannot be undone.')) {
                state.topicStatus = {};
                state.notes = {};
                save();
                render();
                showToast('↩️', 'All progress reset');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!$('#topic-panel').hidden) closePanel();
                else if (!$('#import-modal').hidden) closeImportModal();
            }
            if (e.key === '/' && !isInput(e.target)) {
                e.preventDefault();
                const bar = $('#search-bar');
                bar.hidden = false;
                $('#search-input').focus();
            }
        });
    }

    function isInput(el) {
        return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
    }

    // ========================================================================
    //  INIT
    // ========================================================================

    async function init() {
        loadLocal();
        bindEvents();
        render();
        await load();
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
