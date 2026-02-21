Tasks

1. get_f1_data.py => this file pulls in data from fast f1 package, but if we see the code, it only pulls data from certain methods (lets call them tables)… from each of them only taking in specific variables (lets call them columns)…
    1. What is the problem? => We assume that the gemini only pulled in this much data based on our UI requirements, which is fine. But we are also using XGBoost model in the backend, which may need more data (that is not necessarily showing up in the UI)
    2. Solution? => checkout the documentation for fast f1 package, and see what all data we can get for each table and each column… 
        1. Do logical mapping of what could be important => (Akhilesh)
        2. Do stats mapping of what does data actually say => (Sanket)
    3. NOTE: we are only focusing on 1 map right now which is (Italy, 2023, R)
2. train_engine.py => this file trains the XGBoost model and does some preprocessing on the data from css (loaded using get_f1_data.py)
    1. What is the problem? => data engineering doesn’t look good, gemini just dropped he null records for specific columns. But we need to examine how many of them are actually null? (What if 90% are null? => better to exclude that column)
    2. Solution?  => Plan out all feature engineering techniques and have a separate Jupyter notebook for its experimentation. It could be useful to have reproducible code in future as well. Some key feature engineering things are
        1. Check for null or missing values
        2. Standardization or normalization (do we need this for XGBoost?)
        3. Correlation between variables
    3. NOTE: check different models as well
3. Server/main.py => there are some hardcoded variables over here… check ’current_tire_age’, ‘compund_str’, ‘laps_left’
    1. Problem? => I believe they should not be hardcoded, and should be pulled in from f1 package data or should be updated somehow through code (Akhilesh may be able to help over here)
    2. Solution? => figure out if they should be hardcoded? Or pulled from f1 package? If we do not get it from f1 package then how do we write our own logic for it? Come up with some ideas
4. Server/simulations.py => check code for monte_carlo
    1. Problem? => I didn’t check this much in detail, but we need to make sure that this one is working properly in term of logic. Understand it from real F1 race perspective
        1. Solution? => Go through the each line code and understand why it works the way it is now. Then make sure if its logically correct
        2. Note: Look for any hardcoded variable specially… can cause problems in simulation experience
5. Server/main.py => check gemini call
    1. Problem? => We are directly asking gemini to answer our question about strategy, but is gemini expert in this field? I DON’T THINK SO
    2. Solution? => can we have some kind of LLM fine tuning, where we fine tune the existing model to provide better results?
    3. Note:Fine tuning can be done by LORA layer, I have heard about this technique a lot, but checkout other options as well
