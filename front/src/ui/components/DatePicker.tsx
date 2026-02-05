import type { DatePickerRootProps } from "@ark-ui/solid";
import { Index } from "solid-js";
import { Portal } from "solid-js/web";
import {
	DatePicker,
	DatePickerContent,
	DatePickerContext,
	DatePickerControl,
	DatePickerInput,
	DatePickerNextTrigger,
	DatePickerPositioner,
	DatePickerPrevTrigger,
	DatePickerRangeText,
	DatePickerTable,
	DatePickerTableBody,
	DatePickerTableCell,
	DatePickerTableCellTrigger,
	DatePickerTableHead,
	DatePickerTableHeader,
	DatePickerTableRow,
	DatePickerTrigger,
	DatePickerView,
	DatePickerViewControl,
	DatePickerViewTrigger,
} from "./ui/date-picker";

interface CustomProps {
	placeholder?: string;
	readOnlyInput?: boolean;
}

type CombinedDatePickerProps = DatePickerRootProps & CustomProps;

function DatePickerDemo(props: CombinedDatePickerProps) {
	return (
		<DatePicker startOfWeek={1} {...props}>
			<DatePickerControl>
				<DatePickerInput
					placeholder={props.placeholder}
					fixOnBlur={false}
					readOnly={!!props.readOnly}
					index={0}
				/>
				{props.selectionMode === "range" && (
					<DatePickerInput
						placeholder={props.placeholder}
						fixOnBlur={false}
						readOnly={!!props.readOnlyInput}
						index={1}
					/>
				)}
				<DatePickerTrigger />
			</DatePickerControl>
			<Portal>
				<DatePickerPositioner>
					<DatePickerContent>
						<DatePickerView view="day">
							<DatePickerContext>
								{(api) => (
									<>
										<DatePickerViewControl>
											<DatePickerPrevTrigger />
											<DatePickerViewTrigger>
												<DatePickerRangeText />
											</DatePickerViewTrigger>
											<DatePickerNextTrigger />
										</DatePickerViewControl>
										<DatePickerTable>
											<DatePickerTableHead>
												<DatePickerTableRow>
													<Index each={api().weekDays}>
														{(weekDay) => (
															<DatePickerTableHeader>
																{weekDay().short}
															</DatePickerTableHeader>
														)}
													</Index>
												</DatePickerTableRow>
											</DatePickerTableHead>
											<DatePickerTableBody>
												<Index each={api().weeks}>
													{(week) => (
														<DatePickerTableRow>
															<Index each={week()}>
																{(day) => (
																	<DatePickerTableCell value={day()}>
																		<DatePickerTableCellTrigger>
																			{day().day}
																		</DatePickerTableCellTrigger>
																	</DatePickerTableCell>
																)}
															</Index>
														</DatePickerTableRow>
													)}
												</Index>
											</DatePickerTableBody>
										</DatePickerTable>
									</>
								)}
							</DatePickerContext>
						</DatePickerView>
						<DatePickerView view="month">
							<DatePickerContext>
								{(api) => (
									<>
										<DatePickerViewControl>
											<DatePickerPrevTrigger />
											<DatePickerViewTrigger>
												<DatePickerRangeText />
											</DatePickerViewTrigger>
											<DatePickerNextTrigger />
										</DatePickerViewControl>
										<DatePickerTable>
											<DatePickerTableBody>
												<Index
													each={api().getMonthsGrid({
														columns: 4,
														format: "short",
													})}
												>
													{(months) => (
														<DatePickerTableRow>
															<Index each={months()}>
																{(month) => (
																	<DatePickerTableCell value={month().value}>
																		<DatePickerTableCellTrigger>
																			{month().label}
																		</DatePickerTableCellTrigger>
																	</DatePickerTableCell>
																)}
															</Index>
														</DatePickerTableRow>
													)}
												</Index>
											</DatePickerTableBody>
										</DatePickerTable>
									</>
								)}
							</DatePickerContext>
						</DatePickerView>
						<DatePickerView view="year">
							<DatePickerContext>
								{(api) => (
									<>
										<DatePickerViewControl>
											<DatePickerPrevTrigger />
											<DatePickerViewTrigger>
												<DatePickerRangeText />
											</DatePickerViewTrigger>
											<DatePickerNextTrigger />
										</DatePickerViewControl>
										<DatePickerTable>
											<DatePickerTableBody>
												<Index each={api().getYearsGrid({ columns: 4 })}>
													{(years) => (
														<DatePickerTableRow>
															<Index each={years()}>
																{(year) => (
																	<DatePickerTableCell value={year().value}>
																		<DatePickerTableCellTrigger>
																			{year().label}
																		</DatePickerTableCellTrigger>
																	</DatePickerTableCell>
																)}
															</Index>
														</DatePickerTableRow>
													)}
												</Index>
											</DatePickerTableBody>
										</DatePickerTable>
									</>
								)}
							</DatePickerContext>
						</DatePickerView>
					</DatePickerContent>
				</DatePickerPositioner>
			</Portal>
		</DatePicker>
	);
}

export { DatePickerDemo as DatePicker };
