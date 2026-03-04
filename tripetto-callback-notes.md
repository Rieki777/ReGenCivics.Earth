# Tripetto Callback Notes

The `onSubmit` callback is used for the SDK `run()` function, NOT for `TripettoStudio.form()`.

For TripettoStudio.form() which is used for studio-hosted forms, the callback options are different.

The studio embed doesn't support custom onSubmit callbacks directly - instead, the redirect URL should be configured in the Tripetto Studio itself under the form's closing settings.

**Solution:** Configure the redirect URL in Tripetto Studio:
1. Open the form in Tripetto Studio
2. Go to the form's closing/thank you screen settings
3. Set a redirect URL to /opportunity (or the full URL)

OR

Use the SDK approach with `run()` function instead of `TripettoStudio.form()` which requires:
- Loading the form definition JSON
- Using the runner directly with onSubmit callback
