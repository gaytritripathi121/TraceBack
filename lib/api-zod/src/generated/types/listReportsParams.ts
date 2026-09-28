
import type { CategoryParameter } from './categoryParameter';
import type { ReportTypeParameter } from './reportTypeParameter';
import type { SearchParameter } from './searchParameter';

export type ListReportsParams = {
search?: SearchParameter;
type?: ReportTypeParameter;
category?: CategoryParameter;
};
